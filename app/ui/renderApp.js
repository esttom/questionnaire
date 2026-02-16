/** @param {import('../usecases/formService.js').FormService} service */
export async function renderApp(service) {
  const root = document.getElementById('app');
  let form = await service.loadForm('demo-form');

  root.innerHTML = `
    <main class="app">
      <header>
        <h1>アンケートサービス UI プロトタイプ</h1>
        <p>保存処理なしでフォーム構成を動的に編集できます。</p>
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
      <label>タイトル<input id="titleInput" value="${escapeHtml(form.title)}" /></label>
      <label>説明<textarea id="descriptionInput" rows="3">${escapeHtml(form.description)}</textarea></label>
      <div class="question-list">
        ${form.questions
          .map(
            (q, index) => `
              <article class="question-card" data-qid="${q.id}">
                <header><strong>Q${index + 1}</strong><span>${q.type}</span></header>
                <label>質問文<input data-role="question-title" value="${escapeHtml(q.title)}" /></label>
                <label><input data-role="question-required" type="checkbox" ${q.required ? 'checked' : ''} />必須</label>
                <label>
                  種別
                  <select data-role="question-type">
                    <option value="singleChoice" ${q.type === 'singleChoice' ? 'selected' : ''}>単一選択</option>
                    <option value="multiChoice" ${q.type === 'multiChoice' ? 'selected' : ''}>複数選択</option>
                    <option value="text" ${q.type === 'text' ? 'selected' : ''}>自由記述</option>
                  </select>
                </label>
                ${
                  q.type === 'text'
                    ? '<small>自由記述では選択肢は不要です。</small>'
                    : `<div class="option-list">
                        ${(q.options || [])
                          .map(
                            (o) => `<div class="option-row" data-oid="${o.id}">
                              <input data-role="option-label" value="${escapeHtml(o.label)}" />
                              <button type="button" data-role="remove-option">選択肢削除</button>
                            </div>`
                          )
                          .join('')}
                        <button type="button" data-role="add-option">選択肢追加</button>
                      </div>`
                }
                <button type="button" data-role="remove-question">この質問を削除</button>
              </article>`
          )
          .join('')}
      </div>
      <div>
        <button type="button" data-role="add-single">単一選択を追加</button>
        <button type="button" data-role="add-multi">複数選択を追加</button>
        <button type="button" data-role="add-text">自由記述を追加</button>
      </div>
    `;

    previewEl.innerHTML = `
      <h2>回答プレビュー</h2>
      <form id="answerForm">
        <h3>${escapeHtml(form.title)}</h3>
        <p>${escapeHtml(form.description)}</p>
        ${form.questions
          .map((q, index) => {
            if (q.type === 'text') {
              return `<fieldset class="answer-card"><legend>${index + 1}. ${escapeHtml(q.title)}</legend><textarea data-qid="${q.id}" rows="3"></textarea></fieldset>`;
            }
            const inputType = q.type === 'singleChoice' ? 'radio' : 'checkbox';
            const options = (q.options || [])
              .map(
                (o) => `<label><input data-qid="${q.id}" type="${inputType}" name="${q.id}" value="${escapeHtml(o.label)}"/>${escapeHtml(o.label)}</label>`
              )
              .join('');
            return `<fieldset class="answer-card"><legend>${index + 1}. ${escapeHtml(q.title)} ${q.required ? '<span class="required">*</span>' : ''}</legend>${options}</fieldset>`;
          })
          .join('')}
        <button type="submit">送信</button>
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

    editorEl.querySelector('[data-role="add-single"]').addEventListener('click', () => {
      form = service.addQuestion(form, 'singleChoice');
      draw();
    });

    editorEl.querySelector('[data-role="add-multi"]').addEventListener('click', () => {
      form = service.addQuestion(form, 'multiChoice');
      draw();
    });

    editorEl.querySelector('[data-role="add-text"]').addEventListener('click', () => {
      form = service.addQuestion(form, 'text');
      draw();
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
