// DOM dialogs avoid Electron's Windows focus loss after alert()/confirm().
(() => {
  let queue = Promise.resolve();
  function open(message, confirmation) {
    const task = queue.then(() => new Promise(resolve => {
      const previous = document.activeElement;
      const dialog = document.createElement('dialog');
      dialog.className = 'seal-message-dialog';
      const heading = document.createElement('h2');
      heading.textContent = confirmation ? 'Confirm action' : 'Seal Account Manager';
      const text = document.createElement('p');
      text.textContent = String(message);
      const actions = document.createElement('div');
      actions.className = 'modal-actions';
      const cancel = document.createElement('button');
      cancel.className = 'btn btn-quiet';
      cancel.textContent = 'Cancel';
      const okay = document.createElement('button');
      okay.className = 'btn btn-primary';
      okay.textContent = confirmation ? 'Continue' : 'OK';
      let done = false;
      const finish = result => {
        if (done) return;
        done = true;
        dialog.close();
        dialog.remove();
        if (previous?.isConnected) previous.focus({ preventScroll: true });
        resolve(result);
      };
      cancel.onclick = () => finish(false);
      okay.onclick = () => finish(true);
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
      // Escape belongs to this dialog, not the underlying launcher/modal.
      dialog.addEventListener('keydown', event => event.stopPropagation());
      if (confirmation) actions.append(cancel);
      actions.append(okay);
      dialog.append(heading, text, actions);
      document.body.append(dialog);
      dialog.showModal();
      (confirmation ? cancel : okay).focus();
    }));
    queue = task.catch(() => {});
    return task;
  }
  window.sealAlert = message => open(message, false);
  window.sealConfirm = message => open(message, true);
})();
