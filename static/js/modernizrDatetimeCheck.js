// remove "Open At" option when no browser datetime input.
if (!Modernizr.inputtypes['datetime-local']) {
  document.querySelectorAll('.openAt').forEach(div => {
    div.style.display = 'none';
  });
}
