/** @param {import('../usecases/formService.js').FormService} service */
export async function renderApp(service) {
  const root = document.getElementById('app');
  let form = await service.loadForm('demo-form');

  root.innerHTML = `
    <main class="app">
      <header class="hero">
        <p class="eyebrow">アンケートフォーム</p>
        <h1>アンケート作成・回答プレビュー</h1>
        <p class="lead">フォーム構成を編集しながら、回答画面をその場で確認できます。</p>
      </header>
      <div class="grid">
        <section class="panel" id="editor"></section>
        <section class="panel" id="preview"></section>
      </div>
    </main>
  `;

  const editorEl = root.querySelector('#editor');
  const previewEl = root.querySelector('#preview');
  const response = {};
  const questionTypeLabels = {
    singleChoice: '単一選択',
    multiChoice: '複数選択',
    text: '自由記述',
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const draw = () => {
    editorEl.innerHTML = `
      <h2>フォーム作成</h2>
      <label class="field-block">タイトル<input id="titleInput" value="${escapeHtml(form.title)}" /></label>
      <label class="field-block">説明<textarea id="descriptionInput" rows="3">${escapeHtml(form.description)}</textarea></label>
      <div class="question-list">
        ${form.questions
          .map(
            (q, index) => `
              <article class="question-card" data-qid="${q.id}">
                <header class="question-header">
                  <div class="question-heading">
                    <strong>Q${index + 1}</strong>
                    <span class="type-chip">${questionTypeLabels[q.type] ?? q.type}</span>
                    <span class="required-chip ${q.required ? 'is-required' : 'is-optional'}">${q.required ? '必須' : '任意'}</span>
                  </div>
                  <button class="btn btn-danger btn-sm icon-btn" type="button" data-role="remove-question" aria-label="質問を削除" title="質問を削除">🗑</button>
                </header>
                <label class="field-block">質問文<input data-role="question-title" value="${escapeHtml(q.title)}" /></label>
                <div class="question-config-panel" aria-label="質問の設定">
                  <label class="inline-check compact-check"><input data-role="question-required" type="checkbox" ${q.required ? 'checked' : ''} /><span>必須回答</span></label>
                  <label class="inline-config-field subtle-type-field">
                    <span>種別変更</span>
                    <select data-role="question-type" aria-label="質問の種別変更">
                      <option value="singleChoice" ${q.type === 'singleChoice' ? 'selected' : ''}>単一選択</option>
                      <option value="multiChoice" ${q.type === 'multiChoice' ? 'selected' : ''}>複数選択</option>
                      <option value="text" ${q.type === 'text' ? 'selected' : ''}>自由記述</option>
                    </select>
                  </label>
                </div>
                ${
                  q.type === 'text'
                    ? '<small>自由記述では選択肢は不要です。</small>'
                    : `<div class="option-list">
                        ${(q.options || [])
                          .map(
                            (o) => `<div class="option-row" data-oid="${o.id}">
                              <input data-role="option-label" value="${escapeHtml(o.label)}" />
                              <button class="btn btn-ghost icon-btn" type="button" data-role="remove-option" aria-label="選択肢を削除" title="選択肢を削除">✕</button>
                            </div>`
                          )
                          .join('')}
                        <button class="btn btn-secondary option-add-btn" type="button" data-role="add-option">＋ 選択肢追加</button>
                      </div>`
                }
                <div class="question-insert-actions" aria-label="この質問の後に追加">
                  <span class="insert-action-label">この下に質問を追加</span>
                  <button class="btn btn-ghost add-type-btn" type="button" data-role="add-after" data-qid="${q.id}" data-qtype="singleChoice" aria-label="この下に単一選択を追加" title="この下に単一選択を追加"><span class="add-type-icon" aria-hidden="true">◉</span><span class="add-type-label">単一</span></button>
                  <button class="btn btn-ghost add-type-btn" type="button" data-role="add-after" data-qid="${q.id}" data-qtype="multiChoice" aria-label="この下に複数選択を追加" title="この下に複数選択を追加"><span class="add-type-icon" aria-hidden="true">☑</span><span class="add-type-label">複数</span></button>
                  <button class="btn btn-ghost add-type-btn" type="button" data-role="add-after" data-qid="${q.id}" data-qtype="text" aria-label="この下に自由記述を追加" title="この下に自由記述を追加"><span class="add-type-icon" aria-hidden="true">✎</span><span class="add-type-label">記述</span></button>
                </div>
              </article>`
          )
          .join('')}
      </div>
    `;

    previewEl.innerHTML = `
      <div class="preview-headline">
        <h2>回答プレビュー</h2>
        <p class="preview-meta">全 ${form.questions.length} 問</p>
      </div>
      <form id="answerForm" autocomplete="off">
        <h3>${escapeHtml(form.title)}</h3>
        <p class="preview-description">${escapeHtml(form.description)}</p>
        ${form.questions
          .map((q, index) => {
            if (q.type === 'text') {
              return `<section class="answer-card"><p class="preview-question-title"><span class="preview-question-index">${index + 1}.</span><span class="preview-question-text">${escapeHtml(q.title)}</span></p><textarea data-qid="${q.id}" rows="4"></textarea></section>`;
            }
            const inputType = q.type === 'singleChoice' ? 'radio' : 'checkbox';
            const options = (q.options || [])
              .map(
                (o) => `<label class="choice-row"><input data-qid="${q.id}" type="${inputType}" name="${q.id}" value="${escapeHtml(o.label)}"/><span>${escapeHtml(o.label)}</span></label>`
              )
              .join('');
            return `<section class="answer-card"><p class="preview-question-title"><span class="preview-question-index">${index + 1}.</span><span class="preview-question-text">${escapeHtml(q.title)}</span>${q.required ? '<span class="required">*</span>' : ''}</p><div class="choices">${options}</div></section>`;
          })
          .join('')}
        <button class="btn btn-primary" type="submit">送信</button>
        <p id="submitted"></p>
      </form>
    `;

    editorEl.querySelector('#titleInput').addEventListener('input', (event) => {
      form = service.updateFormMeta(form, { title: event.target.value });
      draw();
    });

    editorEl.querySelector('#descriptionInput').addEventListener('input', (event) => {
      form = service.updateFormMeta(form, { description: event.target.value });
      draw();
    });

    editorEl.querySelectorAll('.question-card').forEach((questionEl) => {
      const { qid } = questionEl.dataset;

      questionEl.querySelector('[data-role="question-title"]').addEventListener('input', (event) => {
        form = service.updateQuestion(form, qid, { title: event.target.value });
        draw();
      });

      questionEl.querySelector('[data-role="question-required"]').addEventListener('change', (event) => {
        form = service.updateQuestion(form, qid, { required: event.target.checked });
        draw();
      });

      questionEl.querySelector('[data-role="question-type"]').addEventListener('change', (event) => {
        form = service.changeQuestionType(form, qid, event.target.value);
        delete response[qid];
        draw();
      });

      questionEl.querySelector('[data-role="remove-question"]').addEventListener('click', () => {
        form = service.removeQuestion(form, qid);
        delete response[qid];
        draw();
      });

      questionEl.querySelector('[data-role="add-option"]')?.addEventListener('click', () => {
        form = service.addOption(form, qid);
        draw();
      });

      questionEl.querySelectorAll('.option-row').forEach((optionEl) => {
        const { oid } = optionEl.dataset;

        optionEl.querySelector('[data-role="option-label"]').addEventListener('input', (event) => {
          form = service.updateOption(form, qid, oid, event.target.value);
          draw();
        });

        optionEl.querySelector('[data-role="remove-option"]').addEventListener('click', () => {
          form = service.removeOption(form, qid, oid);
          draw();
        });
      });
    });

    editorEl.querySelectorAll('[data-role="add-after"]').forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => {
        form = service.insertQuestionAfter(form, buttonEl.dataset.qid, buttonEl.dataset.qtype);
        draw();
      });
    });

    previewEl.querySelectorAll('textarea[data-qid]').forEach((el) => {
      el.addEventListener('input', (event) => {
        response[event.target.dataset.qid] = event.target.value;
      });
    });

    previewEl.querySelectorAll('input[type="radio"]').forEach((el) => {
      el.addEventListener('change', (event) => {
        response[event.target.dataset.qid] = event.target.value;
      });
    });

    previewEl.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      el.addEventListener('change', (event) => {
        const qid = event.target.dataset.qid;
        const current = Array.isArray(response[qid]) ? response[qid] : [];
        response[qid] = event.target.checked
          ? [...current, event.target.value]
          : current.filter((item) => item !== event.target.value);
      });
    });

    previewEl.querySelector('#answerForm').addEventListener('submit', (event) => {
      event.preventDefault();
      previewEl.querySelector('#submitted').textContent = '送信しました（保存は未実装）。';
    });
  };

  draw();
}
