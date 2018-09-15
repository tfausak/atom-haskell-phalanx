const api = require('atom');
const path = require('path');
const process = require('child_process');

module.exports = {
  subscriptions: null,

  activate() {
    this.subscriptions = new api.CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace',
      { 'haskell-phalanx:format': () => this.format() }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  format() {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) { return; }

    const file = editor.getPath();
    const directory = file ? path.dirname(file) : null;
    const brittany = process.spawn('stack', ['exec', '--', 'brittany'],
      { cwd: directory });

    const stdout = [];
    const stderr = [];
    brittany.stdout.on('data', (chunk) => stdout.push(chunk));
    brittany.stderr.on('data', (chunk) => stderr.push(chunk));

    const input = editor.getText();
    brittany.on('close', (status) => {
      console.log('close', status, stdout, stderr, input)
      if (status !== 0) {
        return atom.notifications.addError('Haskell Phalanx',
          { detail: stderr.concat(stdout).join(''), dismissable: true });
      }
      if (stderr.length !== 0) {
        atom.notifications.addWarning('Haskell Phalanx',
          { detail: stderr.join(''), dismissable: true });
      }

      const output = stdout.join('');
      if (output !== input) { editor.setText(output); }
    });

    brittany.stdin.write(input);
    brittany.stdin.end();
  },
};
