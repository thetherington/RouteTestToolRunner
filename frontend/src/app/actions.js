export function registerActions(app) {
    // app.dom has all elements
    app.dom.runBtn.onclick = () => app.startJob();
    app.dom.stopBtn.onclick = () => app.stopJob();
    app.dom.copyBtn.onclick = () => app.copyOutput();
    app.dom.saveBtn.onclick = () => app.saveOutput();
    app.dom.fetchBtn.onclick = () => app.fetchLastResult();

    // Scroll transparency
    window.addEventListener("scroll", () => {
        if (window.scrollY > 4) app.dom.nav.classList.add("nav-transparent");
        else app.dom.nav.classList.remove("nav-transparent");
    });
}
