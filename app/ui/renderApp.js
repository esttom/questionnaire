/** @param {import('../usecases/formService.js').FormService} service */
export async function renderApp(service) {
  const root = document.getElementById('app');
  const form = await service.loadForm('demo-form');

  root.innerHTML = `
    <main class="app">
      <header>
        <h1>アンケートサービス UI プロトタイプ</h1>
        <p>Repository経由で保存。実装を差し替え可能です。</p>
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

  const draw = () => {
    editorEl.innerHTML = `
      <h2>フォーム作成</h2>
      <label>タイトル<input id="titleInput" value="${form.title}" /></label>
      <label>説明<textarea id="descriptionInput" rows="3">${form.description}</textarea></label>
      <div class="question-list">
        ${form.questions
          .map(
            (q, index) => `
              <article class="question-card">
                <header><strong>Q${index + 1}</strong><span>${q.type}</span></header>
                <p>${q.title}</p>
                ${
                  q.options
                    ? `<ul>${q.options.map((o) => `<li>${o.label}</li>`).join('')}</ul>`
                    : '<small>自由記述</small>'
                }
              </article>`
          )
          .join('')}
      </div>
      <small>質問構成はデモ固定です（タイトル・説明のみ編集可）。</small>
    `;

    previewEl.innerHTML = `
      <h2>回答プレビュー</h2>
      <form id="answerForm">
        <h3>${form.title}</h3>
        <p>${form.description}</p>
        ${form.questions
          .map((q, index) => {
            if (q.type === 'text') {
              return `<fieldset class="answer-card"><legend>${index + 1}. ${q.title}</legend><textarea data-qid="${q.id}" rows="3"></textarea></fieldset>`;
            }
            const inputType = q.type === 'singleChoice' ? 'radio' : 'checkbox';
            const options = q.options
              .map(
                (o) => `<label><input data-qid="${q.id}" type="${inputType}" name="${q.id}" value="${o.label}"/>${o.label}</label>`
              )
              .join('');
            return `<fieldset class="answer-card"><legend>${index + 1}. ${q.title} ${q.required ? '<span class="required">*</span>' : ''}</legend>${options}</fieldset>`;
          })
          .join('')}
        <button type="submit">送信</button>
        <p id="submitted"></p>
      </form>
    `;

    editorEl.querySelector('#titleInput').addEventListener('input', async (event) => {
      form.title = event.target.value;
      await service.updateForm(form);
      draw();
    });

    editorEl.querySelector('#descriptionInput').addEventListener('input', async (event) => {
      form.description = event.target.value;
      await service.updateForm(form);
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

    previewEl.querySelector('#answerForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      await service.submit(form.id, response);
      previewEl.querySelector('#submitted').textContent = '送信しました（デモ保存）。';
    });
  };

  draw();
}
