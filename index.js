const api = require('atom');
const path = require('path');
const process = require('child_process');

const NOTIFICATION_TITLE = 'Haskell Phalanx';
const NOTIFICATION_DURATION = 1000;

const addSuccessNotification = (detail) => atom.notifications.addSuccess(
  NOTIFICATION_TITLE,
  { detail, dismissable: true }
);

const addWarningNotification = (stderr) => atom.notifications.addWarning(
  NOTIFICATION_TITLE,
  { detail: stderr.join(''), dismissable: true }
);

const addErrorNotification = (stderr, stdout) => atom.notifications.addError(
  NOTIFICATION_TITLE,
  { detail: stderr.concat(stdout).join(''), dismissable: true }
);

const callBrittany = (editor, done) => {
  const file = editor.getPath();
  const brittany = process.spawn(
    'stack',
    ['exec', '--', 'brittany'],
    { cwd: file ? path.dirname(file) : null }
  );

  const stdout = [];
  const stderr = [];
  brittany.stdout.on('data', (chunk) => stdout.push(chunk));
  brittany.stderr.on('data', (chunk) => stderr.push(chunk));

  const stdin = editor.getText();
  brittany.on('close', (status) => done({ status, stderr, stdin, stdout }));

  brittany.stdin.write(stdin);
  brittany.stdin.end();
};

module.exports = {
  activate () {
    this.subscriptions = new api.CompositeDisposable();
    this.subscriptions.add(atom.commands.add(
      'atom-workspace',
      { 'haskell-phalanx:format': () => this.format() }
    ));
  },

  deactivate () {
    this.subscriptions.dispose();
  },

  format () {
    const editor = atom.workspace.getActiveTextEditor();
    if (editor) {
      callBrittany(editor, ({ status, stderr, stdin, stdout }) => {
        if (status === 0) {
          if (stderr.length !== 0) {
            addWarningNotification(stderr);
          }

          const output = stdout.join('');
          if (output === stdin) {
            const notification = addSuccessNotification('Already formatted!');
            setTimeout(() => notification.dismiss(), NOTIFICATION_DURATION);
          } else {
            editor.setText(output);
          }
        } else {
          addErrorNotification(stderr, stdout);
        }
      });
    }
  },

  subscriptions: null,
};
