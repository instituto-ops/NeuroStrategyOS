const editor = document.getElementById("editor");
const placeholder = document.getElementById("editorPlaceholder");

let editorEnabled = false;

export function enableEditor() {
  editorEnabled = true;
  editor.contentEditable = "true";
  placeholder.style.display = "none";
  editor.focus();
}

export function disableEditor() {
  editorEnabled = false;
  editor.contentEditable = "false";
  if (!editor.textContent.trim()) {
    placeholder.style.display = "block";
  }
}

editor.addEventListener("input", () => {
  if (editor.textContent.trim()) {
    placeholder.style.display = "none";
  }
});
