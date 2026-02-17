/** @param {import('../usecases/formService.js').FormService} service */
export async function renderApp(service) {
  const root = document.getElementById('app');
  let form = await service.loadForm('demo-form');
  const currentResponse = {};
  let validationErrors = {};
  let submittedMessage = '';

  const questionTypeLabels = {
    singleChoice: '単一選択',
    multiChoice: '複数選択',
    text: '自由記述',
  };

  const pageLabels = {
    builder: 'フォーム作成',
    answer: '回答画面',
    dashboard: '回答集計',
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const getCurrentPage = () => {
    const hash = window.location.hash.replace('#/', '');
    return hash in pageLabels ? hash : 'builder';
  };

  const navigate = (page) => {
    if (getCurrentPage() === page) {
      draw();
      return;
    }
    window.location.hash = `/${page}`;
  };

  const resetInvalidState = () => {
    const qidSet = new Set(form.questions.map((question) => question.id));
    Object.keys(currentResponse).forEach((qid) => {
      if (!qidSet.has(qid)) delete currentResponse[qid];
    });
    Object.keys(validationErrors).forEach((qid) => {
      if (!qidSet.has(qid)) delete validationErrors[qid];
    });
  };

  const renderBuilderPage = () => `
    <section class="panel page-panel" id="editor">
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
                  <button class="btn btn-danger btn-sm icon-btn" type="button" data-role="remove-question">🗑</button>
                </header>
                <label class="field-block">質問文<input data-role="question-title" value="${escapeHtml(q.title)}" /></label>
                <div class="question-config-panel">
                  <label class="inline-check compact-check"><input data-role="question-required" type="checkbox" ${q.required ? 'checked' : ''} /><span>必須回答</span></label>
                  <label class="inline-config-field subtle-type-field">
                    <span>種別変更</span>
                    <select data-role="question-type">
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
                              <button class="btn btn-ghost icon-btn" type="button" data-role="remove-option">✕</button>
                            </div>`
                          )
                          .join('')}
                        <button class="btn btn-secondary option-add-btn" type="button" data-role="add-option">＋ 選択肢追加</button>
                      </div>`
                }
                <div class="question-insert-actions">
                  <span class="insert-action-label">この下に質問を追加</span>
                  <button class="btn btn-ghost add-type-btn" type="button" data-role="add-after" data-qid="${q.id}" data-qtype="singleChoice"><span class="add-type-icon" aria-hidden="true">◉</span><span class="add-type-label">単一</span></button>
                  <button class="btn btn-ghost add-type-btn" type="button" data-role="add-after" data-qid="${q.id}" data-qtype="multiChoice"><span class="add-type-icon" aria-hidden="true">☑</span><span class="add-type-label">複数</span></button>
                  <button class="btn btn-ghost add-type-btn" type="button" data-role="add-after" data-qid="${q.id}" data-qtype="text"><span class="add-type-icon" aria-hidden="true">✎</span><span class="add-type-label">記述</span></button>
                </div>
              </article>`
          )
          .join('')}
      </div>
    </section>
  `;

  const renderAnswerQuestion = (question, index) => {
    const errorMessage = validationErrors[question.id];
    const requiredBadge = question.required ? '<span class="required">*</span>' : '';

    if (question.type === 'text') {
      return `<section class="answer-card">
        <p class="preview-question-title"><span class="preview-question-index">${index + 1}.</span><span class="preview-question-text">${escapeHtml(question.title)}</span>${requiredBadge}</p>
        <textarea data-qid="${question.id}" rows="4" placeholder="回答を入力してください">${escapeHtml(currentResponse[question.id] || '')}</textarea>
        ${errorMessage ? `<p class="field-error">${escapeHtml(errorMessage)}</p>` : ''}
      </section>`;
    }

    const inputType = question.type === 'singleChoice' ? 'radio' : 'checkbox';
    const selectedValues = question.type === 'multiChoice' && Array.isArray(currentResponse[question.id])
      ? currentResponse[question.id]
      : [];

    return `<section class="answer-card">
      <p class="preview-question-title"><span class="preview-question-index">${index + 1}.</span><span class="preview-question-text">${escapeHtml(question.title)}</span>${requiredBadge}</p>
      <div class="choices">
        ${(question.options || [])
          .map((option) => {
            const checked = question.type === 'singleChoice'
              ? currentResponse[question.id] === option.label
              : selectedValues.includes(option.label);
            return `<label class="choice-row"><input data-qid="${question.id}" type="${inputType}" name="${question.id}" value="${escapeHtml(option.label)}" ${checked ? 'checked' : ''}/><span>${escapeHtml(option.label)}</span></label>`;
          })
          .join('')}
      </div>
      ${errorMessage ? `<p class="field-error">${escapeHtml(errorMessage)}</p>` : ''}
    </section>`;
  };

  const renderAnswerPage = () => `
    <section class="panel page-panel">
      <h2>回答画面</h2>
      <h3>${escapeHtml(form.title)}</h3>
      <p class="preview-description">${escapeHtml(form.description)}</p>
      <form id="answerForm" autocomplete="off">
        ${form.questions.map(renderAnswerQuestion).join('')}
        <div class="flow-actions">
          <button class="btn btn-primary" type="submit">回答を送信</button>
        </div>
      </form>
      <p id="submitted">${escapeHtml(submittedMessage)}</p>
    </section>
  `;

  const renderDashboardQuestion = (questionSummary, index, totalResponses) => {
    if (questionSummary.type === 'text') {
      return `
        <article class="confirm-item">
          <p class="confirm-question">${index + 1}. ${escapeHtml(questionSummary.title)}</p>
          <p class="preview-meta">回答 ${questionSummary.answeredCount} / ${totalResponses} 件</p>
          <div class="text-answer-list">
            ${questionSummary.recentAnswers.length
              ? questionSummary.recentAnswers.map((answer) => `<p class="confirm-answer">${escapeHtml(answer)}</p>`).join('')
              : '<p class="confirm-answer">まだ回答がありません。</p>'}
          </div>
        </article>
      `;
    }

    return `
      <article class="confirm-item">
        <p class="confirm-question">${index + 1}. ${escapeHtml(questionSummary.title)}</p>
        <p class="preview-meta">回答 ${questionSummary.answeredCount} / ${totalResponses} 件</p>
        <div class="choice-summary-list">
          ${questionSummary.optionCounts
            .map((option) => `<p class="confirm-answer">${escapeHtml(option.label)}: ${option.count}件</p>`)
            .join('')}
        </div>
      </article>
    `;
  };

  const renderDashboardPage = async () => {
    const responses = await service.loadResponses(form.id);
    const summary = service.summarizeResponses(form, responses);

    return `
      <section class="panel page-panel">
        <h2>回答集計</h2>
        <p class="preview-description">総回答数: <strong>${summary.totalResponses}</strong> 件</p>
        <div class="confirm-list">
          ${summary.questions
            .map((questionSummary, index) => renderDashboardQuestion(questionSummary, index, summary.totalResponses))
            .join('')}
        </div>
      </section>
    `;
  };

  const bindBuilderEvents = () => {
    const editorEl = root.querySelector('#editor');

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
        delete currentResponse[qid];
        delete validationErrors[qid];
        draw();
      });

      questionEl.querySelector('[data-role="remove-question"]').addEventListener('click', () => {
        form = service.removeQuestion(form, qid);
        delete currentResponse[qid];
        delete validationErrors[qid];
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
  };

  const bindAnswerEvents = () => {
    root.querySelectorAll('textarea[data-qid]').forEach((el) => {
      el.addEventListener('input', (event) => {
        const qid = event.target.dataset.qid;
        currentResponse[qid] = event.target.value;
        delete validationErrors[qid];
      });
    });

    root.querySelectorAll('input[type="radio"]').forEach((el) => {
      el.addEventListener('change', (event) => {
        const qid = event.target.dataset.qid;
        currentResponse[qid] = event.target.value;
        delete validationErrors[qid];
      });
    });

    root.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      el.addEventListener('change', (event) => {
        const qid = event.target.dataset.qid;
        const current = Array.isArray(currentResponse[qid]) ? currentResponse[qid] : [];
        currentResponse[qid] = event.target.checked
          ? [...current, event.target.value]
          : current.filter((item) => item !== event.target.value);
        delete validationErrors[qid];
      });
    });

    root.querySelector('#answerForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const validation = service.validateResponse(form, currentResponse);
      validationErrors = validation.errors;
      if (!validation.isValid) {
        draw();
        return;
      }

      await service.submit(form.id, currentResponse);
      submittedMessage = '回答を送信しました。ご協力ありがとうございます。';
      form.questions.forEach((question) => {
        delete currentResponse[question.id];
      });
      validationErrors = {};
      draw();
    });
  };

  const draw = async () => {
    resetInvalidState();
    const currentPage = getCurrentPage();

    root.innerHTML = `
      <main class="app">
        <header class="hero">
          <p class="eyebrow">アンケートフォーム</p>
          <h1>アンケート管理システム</h1>
          <p class="lead">回答者向けの入力画面と管理者向けの集計画面を備えた運用想定の構成です。</p>
          <nav class="page-nav" aria-label="ページ遷移">
            ${Object.entries(pageLabels)
              .map(
                ([key, label]) => `<button class="btn ${key === currentPage ? 'btn-primary' : 'btn-ghost'}" type="button" data-role="go-page" data-page="${key}">${label}</button>`
              )
              .join('')}
          </nav>
        </header>
        <div class="page-shell" id="pageContent"></div>
      </main>
    `;

    const pageContent = root.querySelector('#pageContent');

    if (currentPage === 'builder') {
      pageContent.innerHTML = renderBuilderPage();
      bindBuilderEvents();
      submittedMessage = '';
    }

    if (currentPage === 'answer') {
      pageContent.innerHTML = renderAnswerPage();
      bindAnswerEvents();
    }

    if (currentPage === 'dashboard') {
      pageContent.innerHTML = await renderDashboardPage();
      submittedMessage = '';
    }

    root.querySelectorAll('[data-role="go-page"]').forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => {
        navigate(buttonEl.dataset.page);
      });
    });
  };

  window.addEventListener('hashchange', () => {
    draw();
  });

  draw();
}
