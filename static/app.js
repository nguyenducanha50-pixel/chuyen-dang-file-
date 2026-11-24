/* =========================================================
   PDF2Office – logic giao diện
   ========================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const MAX_FILES = 20;

  const dz = $("#dropzone");
  const input = $("#fileInput");
  const tabs = $(".tabs");
  const filePanel = $("#filePanel");
  const fileList = $("#fileList");
  const fileCount = $("#fileCount");
  const addMoreBtn = $("#addMore");
  const clearAllBtn = $("#clearAll");
  const convertBtn = $("#convertBtn");
  const convertLabel = $("#convertLabel");
  const actionTitle = $("#actionTitle");
  const actionSub = $("#actionSub");
  const optionsTitle = $("#optionsTitle");
  const wordOptions = $("#wordOptions");
  const pptOptions = $("#pptOptions");
  const progressPanel = $("#progressPanel");
  const progressFill = $("#progressFill");
  const progressText = $("#progressText");
  const progressPct = $("#progressPct");
  const results = $("#results");
  const resultList = $("#resultList");
  const downloadAllBtn = $("#downloadAll");
  const toastStack = $("#toastStack");

  const MAX_MB = Number(dz.dataset.maxMb || 60);
  const MAX_BYTES = MAX_MB * 1024 * 1024;

  const state = {
    target: "word",
    mode: "image",
    files: [],
    running: false,
    current: null,
    batch: [],
    doneCount: 0,
    seq: 0,
    ticker: null,
  };

  /* ---------------- Tiện ích ---------------- */

  const icon = (id, cls = "") =>
    `<svg${cls ? ` class="${cls}"` : ""} aria-hidden="true"><use href="#${id}"></use></svg>`;

  function formatBytes(bytes) {
    if (!bytes || bytes < 0) return "0 KB";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    const mb = bytes / (1024 * 1024);
    return (mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)) + " MB";
  }

  function baseName(name) {
    return name.replace(/\.pdf$/i, "");
  }

  function isPdf(file) {
    return (
      file.type === "application/pdf" ||
      file.type === "application/x-pdf" ||
      /\.pdf$/i.test(file.name)
    );
  }

  function toast(message, type = "info", timeout = 5200) {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    const iconId = type === "error" ? "i-alert" : type === "success" ? "i-check-circle" : "i-spark";
    el.innerHTML = icon(iconId);
    const text = document.createElement("span");
    text.textContent = message;
    el.append(text);
    toastStack.append(el);
    while (toastStack.children.length > 4) toastStack.firstElementChild.remove();

    const close = () => {
      el.classList.add("is-out");
      setTimeout(() => el.remove(), 240);
    };
    el.addEventListener("click", close);
    setTimeout(close, timeout);
  }

  /* ---------------- Chọn tệp ---------------- */

  function addFiles(fileListLike) {
    if (state.running) return;
    const incoming = Array.from(fileListLike || []);
    if (!incoming.length) return;

    let added = 0;
    let rejectedType = 0;
    let rejectedSize = 0;
    let duplicate = 0;

    for (const file of incoming) {
      if (!isPdf(file)) {
        rejectedType++;
        continue;
      }
      if (file.size > MAX_BYTES) {
        rejectedSize++;
        continue;
      }
      if (state.files.some((f) => f.file.name === file.name && f.file.size === file.size)) {
        duplicate++;
        continue;
      }
      if (state.files.length >= MAX_FILES) {
        toast(`Chỉ có thể chọn tối đa ${MAX_FILES} tệp mỗi lần.`, "info");
        break;
      }

      const entry = {
        id: `f${++state.seq}`,
        file,
        pages: null,
        status: "ready",
        error: "",
        upload: 0,
        fake: 0,
        phase: "idle",
        result: null,
        row: null,
        ui: null,
      };
      state.files.push(entry);
      createRow(entry);
      fetchInfo(entry);
      added++;
    }

    if (rejectedType) toast(`${rejectedType} tệp bị bỏ qua vì không phải PDF.`, "error");
    if (rejectedSize) toast(`${rejectedSize} tệp vượt quá ${MAX_MB} MB nên không được thêm.`, "error");
    if (duplicate && !added) toast("Tệp này đã có trong danh sách.", "info");

    if (added) {
      filePanel.hidden = false;
      renderSummary();
    }
    input.value = "";
  }

  async function fetchInfo(entry) {
    try {
      const form = new FormData();
      form.append("file", entry.file);
      const res = await fetch("/api/info", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.ok) {
        entry.pages = data.pages;
        updateRow(entry);
      }
    } catch (_) {
      /* không quan trọng – chỉ để hiển thị số trang */
    }
  }

  /* ---------------- Hiển thị danh sách ---------------- */

  function createRow(entry) {
    const li = document.createElement("li");
    li.className = "file-row";
    li.dataset.id = entry.id;
    li.innerHTML = `
      <span class="fr-icon">${icon("i-file")}</span>
      <div class="fr-main">
        <span class="fr-name"></span>
        <div class="fr-meta"></div>
      </div>
      <span class="fr-state"></span>
      <button class="fr-remove" type="button" aria-label="Xoá tệp" title="Xoá tệp">
        ${icon("i-x")}
      </button>
      <div class="fr-progress" hidden><span></span></div>
    `;

    const nameEl = li.querySelector(".fr-name");
    nameEl.textContent = baseName(entry.file.name);
    const ext = document.createElement("span");
    ext.className = "ext";
    ext.textContent = " .pdf";
    nameEl.append(ext);

    entry.row = li;
    entry.ui = {
      meta: li.querySelector(".fr-meta"),
      stateEl: li.querySelector(".fr-state"),
      progress: li.querySelector(".fr-progress"),
      progressBar: li.querySelector(".fr-progress > span"),
      remove: li.querySelector(".fr-remove"),
    };

    entry.ui.remove.addEventListener("click", () => removeFile(entry.id));
    fileList.append(li);
    updateRow(entry);
  }

  function updateRow(entry) {
    if (!entry.row) return;
    const { meta, stateEl, progress, progressBar } = entry.ui;

    const metaParts = [`<span>${formatBytes(entry.file.size)}</span>`];
    if (entry.pages) metaParts.push(`<span>${entry.pages} trang</span>`);
    if (entry.status === "done" && entry.result) {
      metaParts.push(`<span class="ok">${formatBytes(entry.result.size)}</span>`);
    }
    if (entry.status === "error") metaParts.push(`<span class="bad" title="${escapeAttr(entry.error)}">Lỗi</span>`);
    meta.innerHTML = metaParts.join("");

    entry.row.classList.toggle("is-done", entry.status === "done");
    entry.row.classList.toggle("is-error", entry.status === "error");

    if (entry.status === "converting") {
      stateEl.className = "fr-state";
      stateEl.innerHTML = `${icon("i-spinner", "spinner")} Đang chuyển…`;
      stateEl.title = "";
      progress.hidden = false;
      progress.classList.add("indeterminate");
      progressBar.style.width = "40%";
    } else if (entry.status === "done") {
      stateEl.className = "fr-state ok";
      stateEl.innerHTML = `${icon("i-check-circle")} Đã xong`;
      stateEl.title = "";
      progress.hidden = true;
      progress.classList.remove("indeterminate");
    } else if (entry.status === "error") {
      stateEl.className = "fr-state bad";
      stateEl.textContent = "Thất bại";
      stateEl.title = entry.error || "";
      progress.hidden = true;
      progress.classList.remove("indeterminate");
    } else {
      stateEl.className = "fr-state";
      stateEl.textContent = "Sẵn sàng";
      stateEl.title = "";
      progress.hidden = true;
      progress.classList.remove("indeterminate");
    }
    fileCount.textContent = String(state.files.length);
  }

  function escapeAttr(value) {
    return String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function removeFile(id) {
    if (state.running) return;
    const index = state.files.findIndex((f) => f.id === id);
    if (index === -1) return;
    const [entry] = state.files.splice(index, 1);
    revokeEntry(entry);
    entry.row?.remove();
    resultList.querySelector(`.result-row[data-id="${entry.id}"]`)?.remove();
    if (!state.files.length) {
      filePanel.hidden = true;
      hideProgress();
      results.hidden = true;
      resultList.innerHTML = "";
    }
    if (!resultList.children.length) results.hidden = true;
    renderSummary();
  }

  function revokeEntry(entry) {
    if (entry.result?.url) URL.revokeObjectURL(entry.result.url);
    entry.result = null;
  }

  function clearAll() {
    if (state.running) return;
    state.files.forEach(revokeEntry);
    state.files = [];
    fileList.innerHTML = "";
    filePanel.hidden = true;
    results.hidden = true;
    resultList.innerHTML = "";
    hideProgress();
    renderSummary();
  }

  /* ---------------- Tóm tắt & nút ---------------- */

  function nounForTarget() {
    return state.target === "word" ? "Word (.docx)" : "PowerPoint (.pptx)";
  }

  function pendingFiles() {
    return state.files.filter((f) => f.status !== "done");
  }

  function renderSummary() {
    const total = state.files.length;
    const pending = pendingFiles();
    const bytes = state.files.reduce((sum, f) => sum + f.file.size, 0);

    convertBtn.disabled = state.running || pending.length === 0;
    convertLabel.textContent = state.running
      ? "Đang chuyển đổi…"
      : pending.length > 0
        ? `Chuyển đổi ${pending.length} tệp`
        : "Chuyển đổi";

    if (state.running) {
      actionTitle.textContent = "Đang xử lý tài liệu…";
      actionSub.textContent = "Vui lòng không đóng tab trong khi chuyển đổi.";
      return;
    }

    if (!total) {
      actionTitle.textContent = "Chưa chọn tệp nào";
      actionSub.textContent = "Tệp PDF sẽ được xử lý riêng và xoá ngay sau khi hoàn tất.";
      return;
    }

    if (pending.length === 0) {
      actionTitle.textContent = `Hoàn tất ${total} tệp`;
      actionSub.textContent = "Tải tệp ở phần kết quả bên dưới.";
      return;
    }

    actionTitle.textContent = `${total} tệp PDF · ${formatBytes(bytes)}`;
    actionSub.textContent = `Sẵn sàng chuyển sang ${nounForTarget()}.`;
  }

  function updateTabs() {
    $$(".tab", tabs).forEach((tab) => {
      const active = tab.dataset.target === state.target;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    tabs.dataset.target = state.target;
    const isWord = state.target === "word";
    wordOptions.hidden = !isWord;
    pptOptions.hidden = isWord;
    optionsTitle.textContent = isWord ? "Tuỳ chọn cho Word" : "Tuỳ chọn cho PowerPoint";
  }

  function switchTarget(target) {
    if (state.running || target === state.target) return;
    state.target = target;
    updateTabs();

    // Kết quả của định dạng cũ không còn đúng nữa.
    state.files.forEach((entry) => {
      if (entry.status === "done" || entry.status === "error") {
        revokeEntry(entry);
        entry.status = "ready";
        entry.error = "";
        entry.phase = "idle";
        entry.upload = 0;
        entry.fake = 0;
        entry.row?.classList.remove("fr-progressing");
        updateRow(entry);
      }
    });

    results.hidden = true;
    resultList.innerHTML = "";
    hideProgress();
    renderSummary();
  }

  /* ---------------- Chuyển đổi ---------------- */

  async function startConversion() {
    if (state.running) return;
    const batch = pendingFiles();
    if (!batch.length) return;

    state.running = true;
    state.batch = batch;
    state.doneCount = 0;
    batch.forEach((entry) => {
      entry.status = "ready";
      entry.error = "";
      entry.upload = 0;
      entry.fake = 0;
      entry.phase = "idle";
      revokeEntry(entry);
      updateRow(entry);
    });

    results.hidden = true;
    resultList.innerHTML = "";
    convertBtn.classList.add("is-busy");
    $(".btn-ico", convertBtn).outerHTML = icon("i-spinner", "btn-ico");
    showProgress();
    renderSummary();
    startTicker();

    for (let i = 0; i < batch.length; i++) {
      const entry = batch[i];
      state.current = entry;
      entry.status = "converting";
      entry.phase = "upload";
      updateRow(entry);
      setProgress(i, batch.length, entry, "upload");

      try {
        const result = await uploadOne(entry, i, batch.length);
        entry.status = "done";
        entry.result = result;
        state.doneCount = i + 1;
        updateRow(entry);
        addResultRow(entry);
        results.hidden = false;
        setProgress(i + 1, batch.length, null, "done");
      } catch (err) {
        entry.status = "error";
        entry.error = err?.message || "Chuyển đổi thất bại.";
        state.doneCount = i + 1;
        updateRow(entry);
        toast(`${entry.file.name}: ${entry.error}`, "error", 8000);
        setProgress(i + 1, batch.length, null, "done");
      }
    }

    state.current = null;
    state.running = false;
    stopTicker();
    convertBtn.classList.remove("is-busy");
    $(".btn-ico", convertBtn).outerHTML = icon("i-bolt", "btn-ico");
    renderSummary();

    const success = batch.filter((f) => f.status === "done").length;
    if (success === batch.length) {
      progressText.textContent = `Hoàn tất! Đã chuyển đổi ${success} tệp.`;
      progressFill.style.width = "100%";
      progressPct.textContent = "100%";
      toast(`Đã chuyển đổi xong ${success} tệp.`, "success");
      setTimeout(() => { if (!state.running) hideProgress(); }, 2200);
    } else if (success > 0) {
      progressText.textContent = `Hoàn tất ${success}/${batch.length} tệp. Xem lỗi trong danh sách.`;
      progressPct.textContent = "100%";
      progressFill.style.width = "100%";
      setTimeout(() => { if (!state.running) hideProgress(); }, 2600);
    } else {
      progressText.textContent = "Không chuyển đổi được tệp nào.";
      progressPct.textContent = "0%";
      setTimeout(() => { if (!state.running) hideProgress(); }, 2600);
    }
  }

  function uploadOne(entry, index, total) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/convert", true);
      xhr.responseType = "blob";
      xhr.timeout = 15 * 60 * 1000;

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        entry.upload = Math.min(1, event.loaded / event.total);
        entry.ui.progressBar.style.width = `${Math.round(entry.upload * 100)}%`;
        if (entry.phase === "upload") setProgress(index, total, entry, "upload");
      };

      xhr.upload.onload = () => {
        entry.phase = "processing";
        entry.fake = 0.02;
        entry.ui.progress.classList.add("indeterminate");
        entry.ui.progressBar.style.width = "40%";
        setProgress(index, total, entry, "processing");
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const blob = xhr.response;
          const header = xhr.getResponseHeader("X-Download-Name");
          const name = header ? decodeURIComponent(header).replace(/^"|"$/g, "") : `${baseName(entry.file.name)}.${state.target === "word" ? "docx" : "pptx"}`;
          resolve({ url: URL.createObjectURL(blob), name, size: blob.size, elapsed: xhr.getResponseHeader("X-Elapsed") });
          return;
        }
        if (xhr.response instanceof Blob) {
          xhr.response.text().then((text) => {
            let message = `Máy chủ trả về lỗi ${xhr.status}.`;
            try {
              const data = JSON.parse(text);
              if (data?.error) message = data.error;
            } catch (_) { /* ignore */ }
            reject(new Error(message));
          }).catch(() => reject(new Error(`Máy chủ trả về lỗi ${xhr.status}.`)));
        } else {
          reject(new Error(`Máy chủ trả về lỗi ${xhr.status}.`));
        }
      };

      xhr.onerror = () => reject(new Error("Không kết nối được máy chủ. Kiểm tra lại kết nối và thử lại."));
      xhr.ontimeout = () => reject(new Error("Quá thời gian xử lý. Vui lòng thử với tệp ít trang hơn."));
      xhr.onabort = () => reject(new Error("Đã huỷ chuyển đổi."));

      const form = new FormData();
      form.append("file", entry.file);
      form.append("target", state.target);
      form.append("mode", state.mode);
      xhr.send(form);
    });
  }

  /* ---------------- Tiến trình ---------------- */

  function showProgress() {
    progressPanel.hidden = false;
    progressFill.style.width = "0%";
    progressText.textContent = "Đang chuẩn bị…";
    progressPct.textContent = "0%";
  }

  function hideProgress() {
    progressPanel.hidden = true;
    stopTicker();
  }

  function setProgress(index, total, entry, phase) {
    const doneFraction = Math.min(index, total) / Math.max(total, 1);
    let phaseFraction = 0;
    let label = "";

    if (phase === "done") {
      phaseFraction = index >= total ? 1 : 0;
      label = index >= total ? `Đang hoàn tất…` : `Đã xong ${index}/${total} tệp…`;
    } else if (entry) {
      if (phase === "processing") {
        phaseFraction = 0.35 + Math.min(entry.fake, 0.9) * 0.65;
        label = `Đang chuyển đổi ${index + 1}/${total}: ${entry.file.name}`;
      } else {
        phaseFraction = Math.min(entry.upload, 1) * 0.3;
        label = `Đang tải lên ${index + 1}/${total}: ${entry.file.name}`;
      }
    }

    const pct = Math.max(0, Math.min(100, Math.round((doneFraction + phaseFraction / Math.max(total, 1)) * 100)));
    progressText.textContent = label || "Đang xử lý…";
    progressFill.style.width = `${pct}%`;
    progressPct.textContent = `${pct}%`;
  }

  function startTicker() {
    stopTicker();
    state.ticker = setInterval(() => {
      const entry = state.current;
      if (!entry || !state.running || entry.phase !== "processing") return;
      entry.fake = Math.min(0.9, entry.fake + 0.015 + Math.random() * 0.03);
      const index = state.batch.indexOf(entry);
      setProgress(index, state.batch.length, entry, "processing");
    }, 550);
  }

  function stopTicker() {
    if (state.ticker) {
      clearInterval(state.ticker);
      state.ticker = null;
    }
  }

  /* ---------------- Kết quả ---------------- */

  function addResultRow(entry) {
    resultList.querySelector(`.result-row[data-id="${entry.id}"]`)?.remove();
    const li = document.createElement("li");
    li.className = "result-row";
    li.dataset.id = entry.id;
    li.innerHTML = `
      <span class="fr-icon">${icon(state.target === "word" ? "i-word" : "i-ppt")}</span>
      <div class="fr-main">
        <span class="fr-name"></span>
        <div class="fr-meta"></div>
      </div>
      <button class="btn-dl" type="button">${icon("i-download")} Tải xuống</button>
    `;
    const name = entry.result?.name || "ket-qua";
    li.querySelector(".fr-name").textContent = name;
    li.querySelector(".fr-meta").textContent = `${formatBytes(entry.result?.size || 0)} · ${state.target === "word" ? "Word" : "PowerPoint"}`;
    li.querySelector(".btn-dl").addEventListener("click", () => downloadEntry(entry));
    resultList.append(li);
  }

  function downloadEntry(entry) {
    if (!entry.result?.url) return;
    const a = document.createElement("a");
    a.href = entry.result.url;
    a.download = entry.result.name;
    document.body.append(a);
    a.click();
    a.remove();
  }

  function downloadAll() {
    const done = state.files.filter((f) => f.status === "done" && f.result?.url);
    if (!done.length) return;
    if (done.length > 1) toast("Trình duyệt có thể hỏi quyền tải nhiều tệp — hãy chọn Cho phép.", "info");
    done.forEach((entry, i) => setTimeout(() => downloadEntry(entry), i * 450));
  }

  /* ---------------- Sự kiện ---------------- */

  dz.addEventListener("click", () => { if (!state.running) input.click(); });
  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!state.running) input.click();
    }
  });

  ["dragenter", "dragover"].forEach((type) => {
    dz.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!state.running) dz.classList.add("is-drag");
    });
  });

  ["dragleave", "drop"].forEach((type) => {
    dz.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (type === "drop") {
        dz.classList.remove("is-drag");
        if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
      } else if (!dz.contains(e.relatedTarget)) {
        dz.classList.remove("is-drag");
      }
    });
  });

  // Kéo thả ở bất kỳ đâu trên trang
  window.addEventListener("dragover", (e) => {
    if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
  });
  window.addEventListener("drop", (e) => {
    if (e.target.closest("#dropzone")) return;
    if (e.dataTransfer?.files?.length) {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    }
  });

  input.addEventListener("change", () => addFiles(input.files));
  addMoreBtn.addEventListener("click", () => { if (!state.running) input.click(); });
  clearAllBtn.addEventListener("click", clearAll);
  convertBtn.addEventListener("click", startConversion);
  downloadAllBtn.addEventListener("click", downloadAll);
  $$(".tab", tabs).forEach((tab) => tab.addEventListener("click", () => switchTarget(tab.dataset.target)));
  $$('input[name="pptMode"]').forEach((radio) =>
    radio.addEventListener("change", () => {
      if (state.running) {
        radio.checked = state.mode === radio.value;
        return;
      }
      if (radio.checked) state.mode = radio.value;
    })
  );

  window.addEventListener("beforeunload", () => {
    state.files.forEach((entry) => { if (entry.result?.url) URL.revokeObjectURL(entry.result.url); });
  });

  $("#year").textContent = String(new Date().getFullYear());
  updateTabs();
  renderSummary();
})();
