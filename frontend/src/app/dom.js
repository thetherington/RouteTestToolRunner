// Caches all DOM selectors on app startup
export function getDom() {
    return {
        nav: document.querySelector("nav"),
        runBtn: document.getElementById("runBtn"),
        stopBtn: document.getElementById("stopBtn"),
        fetchBtn: document.getElementById("fetchResultBtn"),
        spinner: document.getElementById("spinner"),
        beam: document.getElementById("nav-loading-beam"),
        toast: document.getElementById("toast"),
        version: document.getElementById("version"),
        status: document.getElementById("status"),
        output: document.getElementById("output"),
        copyBtn: document.getElementById("copyBtn"),
        saveBtn: document.getElementById("saveBtn"),
        menuBtn: document.getElementById("menuBtn"),
        slidePanel: document.getElementById("slidePanel"),
        closePanelBtn: document.getElementById("closePanelBtn"),
    };
}
