const CATALOG_URL = "https://cdn.jsdelivr.net/gh/xushier/HD-Icons@main/icons.json";
const CATALOG_FALLBACK = "https://raw.githubusercontent.com/xushier/HD-Icons/main/icons.json";
const CATEGORIES = ["all", "border-radius", "circle", "svg"];
const CATEGORY_LABELS = {
    all: "所有",
    "border-radius": "圆角",
    circle: "圆形",
    svg: "矢量",
};

let catalog = [];
let catalogMeta = { update_at: "", total_count: 0 };
let currentType = "all";
let currentQuery = "";

function cdnUrl(rawUrl) {
    return rawUrl.replace(
        "https://raw.githubusercontent.com/xushier/HD-Icons/main/",
        "https://cdn.jsdelivr.net/gh/xushier/HD-Icons@main/"
    );
}

function iconType(url) {
    const path = url.split("/main/")[1] || "";
    return path.split("/")[0];
}

function fileName(url) {
    return decodeURIComponent(url.split("/").pop() || "");
}

function filteredIcons() {
    const query = currentQuery.trim().toLowerCase();
    return catalog.filter((icon) => {
        if (currentType !== "all" && icon.type !== currentType) {
            return false;
        }
        if (!query) {
            return true;
        }
        return icon.name.toLowerCase().includes(query) || icon.file.toLowerCase().includes(query);
    });
}

function updateButtons() {
    CATEGORIES.forEach((type) => {
        const button = document.getElementById(`btn-${type}`);
        button.classList.toggle("bg-fuchsia-600", type === currentType);
    });
}

function updateStatus(count) {
    const status = document.getElementById("status");
    if (currentQuery) {
        status.innerHTML = count > 0
            ? `<div class="status-button">共搜索到 ${count} 个</div>`
            : `<div class="status-button">未找到，试试更短的关键词？</div>
               <a href="https://github.com/xushier/HD-Icons/issues/new/choose" target="_blank" rel="noopener" class="status-button feedback-button">向作者反馈</a>`;
        return;
    }
    const updated = catalogMeta.update_at ? `更新于 ${catalogMeta.update_at}` : "";
    status.innerHTML = `
        <div class="status-button">当前类别：${CATEGORY_LABELS[currentType]}</div>
        <div class="status-button">共有 ${count} 个</div>
        ${updated ? `<div class="status-button">${updated}</div>` : ""}
    `;
}

function showPreview(url) {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    const popup = document.createElement("div");
    popup.className = "popup";
    const image = document.createElement("img");
    image.src = url;
    image.alt = "";
    image.style.maxWidth = "90vw";
    image.style.maxHeight = "80vh";
    image.style.objectFit = "contain";
    popup.appendChild(image);
    document.body.append(overlay, popup);
    requestAnimationFrame(() => {
        overlay.classList.add("active");
        popup.classList.add("active");
    });
    const close = () => {
        overlay.classList.remove("active");
        popup.classList.remove("active");
        setTimeout(() => {
            overlay.remove();
            popup.remove();
        }, 300);
    };
    overlay.addEventListener("click", close);
    popup.addEventListener("click", close);
}

async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const input = document.createElement("textarea");
    input.value = text;
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
}

function renderImages() {
    const icons = filteredIcons();
    const container = document.getElementById("image-container");
    container.replaceChildren();
    updateStatus(icons.length);
    if (icons.length === 0) {
        return;
    }

    const fragment = document.createDocumentFragment();
    icons.forEach((icon) => {
        const card = document.createElement("div");
        card.className = "image-card flex flex-col items-center p-2 rounded-lg relative fade-in";

        const image = document.createElement("img");
        image.alt = icon.file;
        image.className = "w-16 h-16 object-contain cursor-pointer lazy";
        image.dataset.src = icon.displayUrl;
        const name = document.createElement("div");
        name.className = "filename text-center mt-2 px-2 py-1";
        name.textContent = icon.file;
        name.title = icon.file;

        const actions = document.createElement("div");
        actions.className = "image-buttons flex justify-center w-full mt-2";
        const zoom = document.createElement("button");
        zoom.type = "button";
        zoom.className = "p-2 hover:bg-purple-600 rounded-lg transition-colors duration-300 focus:outline-none";
        zoom.innerHTML = '<i class="fas fa-search-plus text-purple-600 hover:text-white"></i>';
        zoom.addEventListener("click", (event) => {
            event.stopPropagation();
            showPreview(icon.displayUrl);
        });
        actions.appendChild(zoom);

        const copied = document.createElement("div");
        copied.className = "copy-success";
        copied.textContent = "复制成功";
        copied.style.borderRadius = "1.5rem";

        card.append(image, name, actions, copied);
        card.addEventListener("click", () => copyAddress(icon.copyUrl, card));
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
    observeImages(container);
}

function observeImages(container) {
    const images = container.querySelectorAll("img.lazy");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }
            const image = entry.target;
            image.src = image.dataset.src;
            image.classList.remove("lazy");
            observer.unobserve(image);
        });
    }, { rootMargin: "200px" });
    images.forEach((image) => observer.observe(image));
}

async function copyAddress(url, card) {
    try {
        await copyText(url);
        const tip = card.querySelector(".copy-success");
        tip.classList.add("active");
        setTimeout(() => tip.classList.remove("active"), 1300);
    } catch (error) {
        console.error(error);
    }
}

function normalizeCatalog(data) {
    catalogMeta = {
        update_at: data.update_at || "",
        total_count: data.total_count || (data.icons || []).length,
    };
    catalog = (data.icons || []).map((icon) => {
        const rawUrl = icon.url;
        return {
            name: icon.name || fileName(rawUrl),
            file: fileName(rawUrl),
            type: iconType(rawUrl),
            copyUrl: rawUrl,
            displayUrl: cdnUrl(rawUrl),
        };
    }).filter((icon) => CATEGORIES.includes(icon.type));
}

async function fetchCatalog(force) {
    const urls = force
        ? [`${CATALOG_FALLBACK}?t=${Date.now()}`, CATALOG_URL]
        : [CATALOG_URL, CATALOG_FALLBACK];
    let lastError = null;
    for (const url of urls) {
        try {
            const response = await fetch(url, { cache: force ? "no-store" : "force-cache" });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

async function loadCatalog(force) {
    const container = document.getElementById("image-container");
    if (force || catalog.length === 0) {
        container.innerHTML = '<div id="loading-spinner" class="col-span-full flex justify-center items-center"><div class="loading-spinner"></div></div>';
    }
    try {
        normalizeCatalog(await fetchCatalog(force));
        renderImages();
        return true;
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="col-span-full text-center">图标列表加载失败，请检查网络后点「检查更新」重试。</div>';
        document.getElementById("status").innerHTML = "";
        return false;
    }
}

function setType(type) {
    currentType = type;
    currentQuery = "";
    document.getElementById("search").value = "";
    updateButtons();
    renderImages();
}

function applySearch() {
    currentQuery = document.getElementById("search").value;
    renderImages();
}

function applyTheme(dark) {
    document.body.classList.toggle("night-mode", dark);
    document.body.classList.toggle("day-mode", !dark);
    const button = document.getElementById("toggle-mode");
    button.innerHTML = dark
        ? '<i class="fas fa-sun"></i><span class="hidden md:inline">日间模式</span>'
        : '<i class="fas fa-moon"></i><span class="hidden md:inline">夜间模式</span>';
}

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(location.search);
    if (CATEGORIES.includes(params.get("type"))) {
        currentType = params.get("type");
    }
    if (params.get("q")) {
        currentQuery = params.get("q");
        document.getElementById("search").value = currentQuery;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    applyTheme(media.matches);
    media.addEventListener("change", (event) => applyTheme(event.matches));

    document.getElementById("toggle-mode").addEventListener("click", () => {
        applyTheme(!document.body.classList.contains("night-mode"));
    });
    document.getElementById("search-button").addEventListener("click", applySearch);
    document.getElementById("search").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            applySearch();
        }
    });
    document.getElementById("check-update").addEventListener("click", async () => {
        const previous = catalogMeta.update_at;
        const ok = await loadCatalog(true);
        if (!ok) {
            alert("检查更新失败，请稍后重试。");
            return;
        }
        const changed = previous && previous !== catalogMeta.update_at;
        alert(changed
            ? `图标库已更新：${catalogMeta.update_at}，共 ${catalog.length} 个。`
            : `暂无新索引。当前更新于 ${catalogMeta.update_at || "未知时间"}，共 ${catalog.length} 个。`);
    });
    CATEGORIES.forEach((type) => {
        document.getElementById(`btn-${type}`).addEventListener("click", () => setType(type));
    });
    updateButtons();
    loadCatalog(false);
});
