import dialogues from '../data/dialogues.json';

export class DialogueManager {
  constructor({ onStartQuest, onClose }) {
    this.onStartQuest = onStartQuest;
    this.onClose = onClose;

    this.box = document.getElementById('dialogue-box');
    this.speakerEl = document.getElementById('dialogue-speaker');
    this.textEl = document.getElementById('dialogue-text');
    this.optionsEl = document.getElementById('dialogue-options');
    document.getElementById('btn-dialogue-close').addEventListener('click', () => this.close());
  }

  isOpen() {
    return !this.box.classList.contains('hidden');
  }

  openPhilosopher(id, completedSet) {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.box.classList.remove('hidden');

    if (id === 'hypatia') {
      const d = dialogues.hypatia;
      const count = String(Math.min(5, completedSet.size));
      this.speakerEl.textContent = d.title;
      this.textEl.textContent = `${d.open} ${d.hints[count]}`;
      this._setOptions([{ label: 'Teşekkürler, yola devam edeyim', primary: true, action: () => this.close() }]);
      return;
    }

    const d = dialogues[id];
    if (!d) return;

    this.speakerEl.textContent = d.title;
    if (completedSet.has(id)) {
      this.textEl.textContent = d.afterQuest;
      this._setOptions([{ label: 'Kapat', primary: true, action: () => this.close() }]);
      return;
    }

    this.textEl.textContent = d.open;
    this._setOptions(
      d.options1.map((opt) => ({
        label: opt.label,
        action: () => this._step2(id, d, opt.reply),
      }))
    );
  }

  _step2(id, d, replyText) {
    if (id === 'sokrates') {
      this.textEl.textContent = `${replyText} ${d.common}`;
      this._setOptions([
        {
          label: 'Hazırım, soruları sor',
          primary: true,
          action: () => this._offerQuest(id, d.questOffer),
        },
      ]);
      return;
    }

    this.textEl.textContent = replyText;
    this._setOptions(
      d.options2.map((opt) => ({
        label: opt.label,
        action: () => this._step3(id, d, opt.reply),
      }))
    );
  }

  _step3(id, d, replyText) {
    this.textEl.textContent = replyText;
    this._setOptions([
      {
        label: 'Görevi Dinle',
        primary: true,
        action: () => this._offerQuest(id, d.questOffer),
      },
    ]);
  }

  _offerQuest(id, text) {
    this.textEl.textContent = text;
    this._setOptions([
      {
        label: 'Görevi Başlat',
        primary: true,
        action: () => {
          this.close(false);
          this.onStartQuest(id);
        },
      },
      { label: 'Sonra gelirim', action: () => this.close() },
    ]);
  }

  openTempleFinale(onFinish) {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.box.classList.remove('hidden');
    this.speakerEl.textContent = dialogues.temple.name;
    this.textEl.textContent = dialogues.temple.finale;
    this._setOptions([
      {
        label: 'Yolculuğu Tamamla',
        primary: true,
        action: () => {
          this.close();
          onFinish?.();
        },
      },
    ]);
  }

  _setOptions(items) {
    this.optionsEl.innerHTML = '';
    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = `option-btn${item.primary ? ' primary' : ''}`;
      btn.textContent = item.label;
      btn.addEventListener('click', item.action);
      this.optionsEl.appendChild(btn);
    });
  }

  close(notify = true) {
    this.box.classList.add('hidden');
    if (notify) this.onClose?.();
  }
}
