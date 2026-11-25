import questsData from '../data/quests.json';

const STORAGE_KEY = 'felsefe_sokagi_keys_v1';

export class QuestManager {
  constructor({ sound, onProgressChange, onToast }) {
    this.sound = sound;
    this.onProgressChange = onProgressChange;
    this.onToast = onToast;

    this.quests = questsData.gorevler;
    this.completed = new Set(this._loadSaved());

    this.modal = document.getElementById('quest-modal');
    this.titleEl = document.getElementById('quest-modal-title');
    this.bodyEl = document.getElementById('quest-modal-body');
    this.keysCountEl = document.getElementById('keys-count');
    this.keysBarEl = document.getElementById('keys-bar');
    this.questListEl = document.getElementById('quest-list');

    document.getElementById('btn-quest-close').addEventListener('click', () => this.close());
    this.renderHUD();
  }

  _loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.completed]));
    } catch {
      // localStorage devre dışıysa sessizce geç
    }
  }

  isOpen() {
    return !this.modal.classList.contains('hidden');
  }

  close() {
    this.modal.classList.add('hidden');
  }

  renderHUD() {
    this.keysCountEl.textContent = String(this.completed.size);
    this.keysBarEl.innerHTML = '';
    this.questListEl.innerHTML = '';

    this.quests.forEach((q) => {
      const done = this.completed.has(q.id);
      const slot = document.createElement('div');
      slot.className = `key-slot${done ? ' collected' : ''}`;
      slot.title = `${q.anahtarAdi} (${done ? 'Toplandı' : 'Eksik'})`;
      slot.textContent = q.ikon;
      this.keysBarEl.appendChild(slot);

      const li = document.createElement('li');
      li.className = done ? 'done' : '';
      li.textContent = `${done ? '✓' : '○'} ${q.filozof} — ${q.anahtarAdi}`;
      this.questListEl.appendChild(li);
    });
  }

  completeQuest(id, message) {
    const q = this.quests.find((item) => item.id === id);
    const newlyAdded = !this.completed.has(id);
    this.completed.add(id);
    this._save();
    this.renderHUD();
    this.sound.playSuccess();

    this.bodyEl.innerHTML = `
      <div class="feedback-box success">
        <strong>Tebrikler!</strong> ${message || ''}
        <p style="margin:8px 0 0">${q.ikon} <strong>${q.anahtarAdi}</strong> envanterine eklendi!</p>
      </div>
      <div style="margin-top:14px; text-align:right">
        <button id="btn-finish-quest" class="btn-primary">Devam Et</button>
      </div>
    `;
    document.getElementById('btn-finish-quest').addEventListener('click', () => {
      this.close();
      if (newlyAdded) {
        this.onToast(`${q.ikon} ${q.anahtarAdi} kazanıldı! (${this.completed.size}/5)`);
      }
      this.onProgressChange?.(this.completed);
    });
  }

  openQuest(id) {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    const quest = this.quests.find((q) => q.id === id);
    if (!quest) return;

    this.titleEl.textContent = `${quest.filozof} Görevi`;
    this.modal.classList.remove('hidden');

    if (quest.tur === 'coktan_secmeli') this._renderQuiz(quest);
    else if (quest.tur === 'eslestirme') this._renderMatching(quest);
    else if (quest.tur === 'siniflandirma') this._renderClassification(quest);
    else if (quest.tur === 'cumle_ve_soru') this._renderDescartes(quest);
    else if (quest.tur === 'not_sirala_ve_soru') this._renderNietzsche(quest);
  }

  _renderQuiz(quest) {
    let idx = 0;
    const renderStep = (hintMsg = '') => {
      const s = quest.sorular[idx];
      this.bodyEl.innerHTML = `
        <p><strong>Soru ${idx + 1} / ${quest.sorular.length}:</strong> ${s.soru}</p>
        <div class="quiz-options" id="quiz-opts"></div>
        ${hintMsg ? `<div class="feedback-box hint">${hintMsg}</div>` : ''}
      `;
      const container = document.getElementById('quiz-opts');
      s.secenekler.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
          if (i === s.dogru) {
            idx++;
            if (idx >= quest.sorular.length) {
              this.completeQuest(quest.id, 'Doğru soruyu sormak seni bilge yapar.');
            } else {
              renderStep();
            }
          } else {
            renderStep(`İpucu: ${s.ipucu}`);
          }
        });
        container.appendChild(btn);
      });
    };
    renderStep();
  }

  _renderMatching(quest) {
    const shadows = [...quest.ciftler];
    const objects = [...quest.ciftler].sort(() => Math.random() - 0.5);
    const matchedIds = new Set();
    let selectedShadow = null;

    const draw = (feedback = '') => {
      this.bodyEl.innerHTML = `
        <p>${quest.aciklama}</p>
        <div class="match-columns">
          <div class="match-col" id="col-shadows"><strong>Duvardaki Gölgeler</strong></div>
          <div class="match-col" id="col-objects"><strong>Gerçek Nesneler</strong></div>
        </div>
        ${feedback ? `<div class="feedback-box hint">${feedback}</div>` : ''}
      `;

      const colS = document.getElementById('col-shadows');
      const colO = document.getElementById('col-objects');

      shadows.forEach((item) => {
        const btn = document.createElement('button');
        const isMatched = matchedIds.has(item.golgeId);
        btn.className = `item-chip${isMatched ? ' matched' : ''}${selectedShadow === item.golgeId ? ' selected' : ''}`;
        btn.textContent = item.golge;
        btn.disabled = isMatched;
        btn.addEventListener('click', () => {
          selectedShadow = item.golgeId;
          draw();
        });
        colS.appendChild(btn);
      });

      objects.forEach((item) => {
        const btn = document.createElement('button');
        const isMatched = matchedIds.has(item.golgeId);
        btn.className = `item-chip${isMatched ? ' matched' : ''}`;
        btn.textContent = item.nesne;
        btn.disabled = isMatched;
        btn.addEventListener('click', () => {
          if (!selectedShadow) {
            draw('Önce sol sütundan bir gölge seç.');
            return;
          }
          if (selectedShadow === item.golgeId) {
            matchedIds.add(item.golgeId);
            selectedShadow = null;
            if (matchedIds.size === quest.ciftler.length) {
              this.completeQuest(quest.id, quest.tamamMesaji);
            } else {
              draw();
            }
          } else {
            selectedShadow = null;
            draw('Bu gölge o nesneye ait değil, şeklini tekrar düşün.');
          }
        });
        colO.appendChild(btn);
      });
    };
    draw();
  }

  _renderClassification(quest) {
    let idx = 0;
    const draw = (feedback = '') => {
      const book = quest.kitaplar[idx];
      this.bodyEl.innerHTML = `
        <p>${quest.aciklama}</p>
        <div class="item-chip selected" style="text-align:center; font-weight:700; font-size:15px;">
          Kitap ${idx + 1} / ${quest.kitaplar.length}: "${book.ad}"
        </div>
        <div class="shelf-row" id="shelf-btns"></div>
        ${feedback ? `<div class="feedback-box hint">${feedback}</div>` : ''}
      `;
      const row = document.getElementById('shelf-btns');
      quest.raflar.forEach((raf) => {
        const btn = document.createElement('button');
        btn.className = 'shelf-btn';
        btn.textContent = `${raf} Rafı`;
        btn.addEventListener('click', () => {
          if (raf === book.raf) {
            idx++;
            if (idx >= quest.kitaplar.length) {
              this.completeQuest(quest.id, 'Tüm kitapları doğru sınıflandırdın.');
            } else {
              draw();
            }
          } else {
            draw(quest.yanlisIpucu);
          }
        });
        row.appendChild(btn);
      });
    };
    draw();
  }

  _renderDescartes(quest) {
    let chosen = [];
    let qIdx = 0;

    const drawSentence = (feedback = '') => {
      this.bodyEl.innerHTML = `
        <p>${quest.aciklama}</p>
        <div class="word-row" id="chosen-words">${chosen.length ? '' : '<span style="color:#888">Kelimelere sırayla tıkla...</span>'}</div>
        <div class="shelf-row" id="bank-words"></div>
        <div style="margin-top:10px; display:flex; gap:8px;">
          <button id="btn-reset-words" class="btn-secondary">Sıfırla</button>
        </div>
        ${feedback ? `<div class="feedback-box hint">${feedback}</div>` : ''}
      `;

      const chosenBox = document.getElementById('chosen-words');
      chosen.forEach((w) => {
        const span = document.createElement('span');
        span.className = 'item-chip matched';
        span.textContent = w;
        chosenBox.appendChild(span);
      });

      const bank = document.getElementById('bank-words');
      quest.karisikKelimeler.forEach((w) => {
        if (chosen.includes(w)) return;
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = w;
        btn.addEventListener('click', () => {
          chosen.push(w);
          if (chosen.length === quest.dogruCumle.length) {
            const ok = chosen.every((val, i) => val === quest.dogruCumle[i]);
            if (ok) {
              drawQuestions();
            } else {
              chosen = [];
              drawSentence('Sıra doğru değil. "Düşünüyorum, öyleyse varım" cümlesini kur.');
            }
          } else {
            drawSentence();
          }
        });
        bank.appendChild(btn);
      });

      document.getElementById('btn-reset-words').addEventListener('click', () => {
        chosen = [];
        drawSentence();
      });
    };

    const drawQuestions = (hint = '') => {
      const s = quest.sorular[qIdx];
      this.bodyEl.innerHTML = `
        <div class="feedback-box success" style="margin-bottom:10px">"Düşünüyorum, öyleyse varım" doğrulandı!</div>
        <p><strong>Şüphe Sorusu ${qIdx + 1}/${quest.sorular.length}:</strong> ${s.soru}</p>
        <div class="quiz-options" id="desc-opts"></div>
        ${hint ? `<div class="feedback-box hint">${hint}</div>` : ''}
      `;
      const container = document.getElementById('desc-opts');
      s.secenekler.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
          if (i === s.dogru) {
            qIdx++;
            if (qIdx >= quest.sorular.length) {
              this.completeQuest(quest.id, quest.tamamMesaji);
            } else {
              drawQuestions();
            }
          } else {
            drawQuestions(`İpucu: ${s.ipucu}`);
          }
        });
        container.appendChild(btn);
      });
    };

    drawSentence();
  }

  _renderNietzsche(quest) {
    const shuffled = [...quest.notlar].sort(() => Math.random() - 0.5);
    let nextId = 1;

    const drawNotes = (feedback = '') => {
      this.bodyEl.innerHTML = `
        <p>${quest.aciklama}</p>
        <div class="notes-list" id="notes-container"></div>
        ${feedback ? `<div class="feedback-box hint">${feedback}</div>` : ''}
      `;
      const list = document.getElementById('notes-container');
      shuffled.forEach((n) => {
        const read = n.id < nextId;
        const btn = document.createElement('button');
        btn.className = `item-chip${read ? ' matched' : ''}`;
        btn.innerHTML = `<strong>${n.etiket}:</strong> ${n.metin}`;
        btn.disabled = read;
        btn.addEventListener('click', () => {
          if (n.id === nextId) {
            nextId++;
            if (nextId > quest.notlar.length) {
              drawQuestion();
            } else {
              drawNotes();
            }
          } else {
            drawNotes(`Önce Not ${nextId}'i okumalısın.`);
          }
        });
        list.appendChild(btn);
      });
    };

    const drawQuestion = (hint = '') => {
      const s = quest.soru;
      this.bodyEl.innerHTML = `
        <div class="feedback-box success" style="margin-bottom:10px">Üç not doğru sırayla okundu!</div>
        <p><strong>Soru:</strong> ${s.soru}</p>
        <div class="quiz-options" id="nietzsche-opts"></div>
        ${hint ? `<div class="feedback-box hint">${hint}</div>` : ''}
      `;
      const container = document.getElementById('nietzsche-opts');
      s.secenekler.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
          if (i === s.dogru) {
            this.completeQuest(quest.id, 'Cesaret sorgulamaktan korkmamaktır.');
          } else {
            drawQuestion(`İpucu: ${s.ipucu}`);
          }
        });
        container.appendChild(btn);
      });
    };

    drawNotes();
  }
}
