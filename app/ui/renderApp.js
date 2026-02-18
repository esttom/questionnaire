/** @param {import('../usecases/formService.js').FormService} service */
export async function renderApp(service) {
  const root = document.getElementById('app');
  /** @type {import('../domain/formModels.js').FormDefinition|null} */
  let currentForm = null;
  const currentResponse = {};
  let validationErrors = {};
  let submittedMessage = '';
  let editorMessage = '';
  let builderActiveTab = 'edit';

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

  const parseRoute = () => {
    const clean = window.location.hash.replace(/^#\/?/, '');
    const [page = 'dashboard', formId = ''] = clean.split('/');
    if (!['dashboard', 'builder', 'answer', 'results'].includes(page)) {
      return { page: 'dashboard', formId: '' };
    }
    return { page, formId };
  };

  const navigate = (page, formId = '') => {
    const nextHash = formId ? `#/${page}/${formId}` : `#/${page}`;
    if (window.location.hash === nextHash) {
      draw();
      return;
    }
    window.location.hash = nextHash;
  };

  const openAnswerUrl = (formId) => {
    const answerUrl = `${window.location.origin}${window.location.pathname}#/answer/${formId}`;
    window.open(answerUrl, '_blank', 'noopener');
  };

  const copyAnswerUrl = async (formId) => {
    const answerUrl = `${window.location.origin}${window.location.pathname}#/answer/${formId}`;
    try {
      await navigator.clipboard.writeText(answerUrl);
      return '回答URLをコピーしました。';
    } catch {
      return '回答URLのコピーに失敗しました。';
    }
  };

  const renderDashboardPage = async () => {
    const forms = await service.loadForms();
    return `
      <section class="panel page-panel">
        <div class="dashboard-head">
          <div>
            <h2>ダッシュボード</h2>
            <p class="preview-description">作成済みフォームの管理と回答受付を行います。</p>
          </div>
          <button class="btn btn-primary" type="button" data-role="create-form">＋ 新規フォーム作成</button>
        </div>
        <div class="form-list">
          ${forms.length
            ? forms
                .map(
                  (form) => `
                    <article class="form-list-card">
                      <h3>${escapeHtml(form.title || '（無題のフォーム）')}</h3>
                      <p class="preview-description">質問数: ${form.questions.length}</p>
                      <div class="action-group">
                        <p class="action-group-title">管理</p>
                        <div class="row-actions">
                          <button class="btn btn-secondary" type="button" data-role="open-edit" data-form-id="${escapeHtml(form.id)}">編集する</button>
                          <button class="btn btn-ghost" type="button" data-role="open-results" data-form-id="${escapeHtml(form.id)}">集計を見る</button>
                        </div>
                      </div>
                      <div class="action-group">
                        <p class="action-group-title">回答受付</p>
                        <div class="row-actions">
                          <button class="btn btn-secondary" type="button" data-role="open-answer" data-form-id="${escapeHtml(form.id)}">回答画面を開く</button>
                          <button class="btn btn-ghost" type="button" data-role="copy-answer-url" data-form-id="${escapeHtml(form.id)}">回答URLをコピー</button>
                        </div>
                      </div>
                    </article>
                  `
                )
                .join('')
            : '<p class="preview-description">フォームがありません。新規フォームを作成してください。</p>'}
        </div>
      </section>
    `;
  };

  const renderBuilderPage = () => {
    const form = currentForm;
    if (!form) return '<section class="panel page-panel"><p>フォームが見つかりません。</p></section>';

    const renderBuilderPreview = () => `
      <section class="builder-preview" aria-label="プレビュー">
        <h3>${escapeHtml(form.title || '（無題のフォーム）')}</h3>
        <p class="preview-description">${escapeHtml(form.description)}</p>
        <div id="answerForm" autocomplete="off">
          ${form.questions.map(renderAnswerQuestion).join('')}
        </div>
      </section>
    `;

    return `
      <section class="panel page-panel" id="editor">
        <div class="page-headline">
          <h2>フォーム作成・編集</h2>
          <div class="row-actions">
            <button class="btn btn-secondary" type="button" data-role="back-dashboard">ダッシュボードへ戻る</button>
            <button class="btn btn-primary" type="button" data-role="save-form">保存</button>
          </div>
        </div>
        <div class="builder-tablist" role="tablist" aria-label="編集画面タブ">
          <button class="builder-tab ${builderActiveTab === 'edit' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${builderActiveTab === 'edit'}" data-role="builder-tab" data-tab="edit">編集</button>
          <button class="builder-tab ${builderActiveTab === 'preview' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${builderActiveTab === 'preview'}" data-role="builder-tab" data-tab="preview">プレビュー</button>
        </div>
        ${
          builderActiveTab === 'edit'
            ? `<label class="field-block">タイトル<input id="titleInput" value="${escapeHtml(form.title)}" /></label>
        <label class="field-block">説明<textarea id="descriptionInput" rows="3">${escapeHtml(form.description)}</textarea></label>
        <div class="question-list">
          ${form.questions
            .map(
              (q, index) => `
                <article class="question-card" data-qid="${q.id}">
                  <header class="question-header">
                    <div class="question-heading">
                      <strong>Q${index + 1}</strong>
                      <span class="question-meta">${questionTypeLabels[q.type] ?? q.type} / ${q.required ? '必須' : '任意'}</span>
                    </div>
                    <button class="btn btn-danger btn-sm icon-btn" type="button" data-role="remove-question">🗑</button>
                  </header>
                  <label class="field-block">質問文<input data-role="question-title" value="${escapeHtml(q.title)}" /></label>
                  <div class="question-config-panel">
                    <label class="inline-config-field subtle-type-field">
                      <span>種別変更</span>
                      <select data-role="question-type">
                        <option value="singleChoice" ${q.type === 'singleChoice' ? 'selected' : ''}>単一選択</option>
                        <option value="multiChoice" ${q.type === 'multiChoice' ? 'selected' : ''}>複数選択</option>
                        <option value="text" ${q.type === 'text' ? 'selected' : ''}>自由記述</option>
                      </select>
                    </label>
                    <label class="inline-check compact-check"><input data-role="question-required" type="checkbox" ${q.required ? 'checked' : ''} /><span>必須回答</span></label>
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
                  <div class="question-insert-row">
                    <button class="btn btn-secondary btn-sm question-insert-btn" type="button" data-role="add-after" data-qid="${q.id}">質問を追加</button>
                  </div>
                </article>`
            )
            .join('')}
          ${
            form.questions.length === 0
              ? '<p class="preview-description">質問がありません。下のボタンから追加してください。</p>'
              : ''
          }
        </div>
        <div class="flow-actions">
          <button class="btn btn-ghost" type="button" data-role="add-new-question">＋ 質問を追加</button>
        </div>`
            : renderBuilderPreview()
        }
        <p id="submitted">${escapeHtml(editorMessage)}</p>
      </section>
    `;
  };

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
    const selectedValues =
      question.type === 'multiChoice' && Array.isArray(currentResponse[question.id])
        ? currentResponse[question.id]
        : [];

    return `<section class="answer-card">
      <p class="preview-question-title"><span class="preview-question-index">${index + 1}.</span><span class="preview-question-text">${escapeHtml(question.title)}</span>${requiredBadge}</p>
      <div class="choices">
        ${(question.options || [])
          .map((option) => {
            const checked =
              question.type === 'singleChoice'
                ? currentResponse[question.id] === option.label
                : selectedValues.includes(option.label);
            return `<label class="choice-row"><input data-qid="${question.id}" type="${inputType}" name="${question.id}" value="${escapeHtml(option.label)}" ${checked ? 'checked' : ''}/><span>${escapeHtml(option.label)}</span></label>`;
          })
          .join('')}
      </div>
      ${errorMessage ? `<p class="field-error">${escapeHtml(errorMessage)}</p>` : ''}
    </section>`;
  };

  const renderAnswerPage = () => {
    const form = currentForm;
    if (!form) return '<section class="panel page-panel"><p>フォームが見つかりません。</p></section>';

    return `
      <section class="panel page-panel">
        <div class="page-headline">
          <h2>フォーム回答画面</h2>
        </div>
        <h3>${escapeHtml(form.title || '（無題のフォーム）')}</h3>
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
  };

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

  const renderResultsPage = async () => {
    const form = currentForm;
    if (!form) return '<section class="panel page-panel"><p>フォームが見つかりません。</p></section>';
    const responses = await service.loadResponses(form.id);
    const summary = service.summarizeResponses(form, responses);

    return `
      <section class="panel page-panel">
        <div class="page-headline">
          <h2>集計結果画面</h2>
          <button class="btn btn-secondary" type="button" data-role="back-dashboard">ダッシュボードへ戻る</button>
        </div>
        <p class="preview-description">対象フォーム: ${escapeHtml(form.title || '（無題のフォーム）')}</p>
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
    if (!currentForm) return;
    const editorEl = root.querySelector('#editor');

    editorEl.querySelectorAll('[data-role="builder-tab"]').forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => {
        builderActiveTab = buttonEl.dataset.tab;
        draw();
      });
    });

    if (builderActiveTab !== 'edit') {
      editorEl.querySelector('[data-role="back-dashboard"]').addEventListener('click', () => {
        editorMessage = '';
        navigate('dashboard');
      });
      editorEl.querySelector('[data-role="save-form"]').addEventListener('click', async () => {
        await service.saveForm(currentForm);
        editorMessage = 'フォームを保存しました。';
        draw();
      });
      return;
    }

    editorEl.querySelector('#titleInput').addEventListener('input', (event) => {
      currentForm = service.updateFormMeta(currentForm, { title: event.target.value });
      editorMessage = '';
    });

    editorEl.querySelector('#descriptionInput').addEventListener('input', (event) => {
      currentForm = service.updateFormMeta(currentForm, { description: event.target.value });
      editorMessage = '';
    });

    editorEl.querySelectorAll('.question-card').forEach((questionEl) => {
      const { qid } = questionEl.dataset;

      questionEl.querySelector('[data-role="question-title"]').addEventListener('input', (event) => {
        currentForm = service.updateQuestion(currentForm, qid, { title: event.target.value });
        editorMessage = '';
      });

      questionEl.querySelector('[data-role="question-required"]').addEventListener('change', (event) => {
        currentForm = service.updateQuestion(currentForm, qid, { required: event.target.checked });
        editorMessage = '';
        draw();
      });

      questionEl.querySelector('[data-role="question-type"]').addEventListener('change', (event) => {
        currentForm = service.changeQuestionType(currentForm, qid, event.target.value);
        delete currentResponse[qid];
        delete validationErrors[qid];
        editorMessage = '';
        draw();
      });

      questionEl.querySelector('[data-role="remove-question"]').addEventListener('click', () => {
        currentForm = service.removeQuestion(currentForm, qid);
        delete currentResponse[qid];
        delete validationErrors[qid];
        editorMessage = '';
        draw();
      });

      questionEl.querySelector('[data-role="add-option"]')?.addEventListener('click', () => {
        currentForm = service.addOption(currentForm, qid);
        editorMessage = '';
        draw();
      });

      questionEl.querySelectorAll('.option-row').forEach((optionEl) => {
        const { oid } = optionEl.dataset;

        optionEl.querySelector('[data-role="option-label"]').addEventListener('input', (event) => {
          currentForm = service.updateOption(currentForm, qid, oid, event.target.value);
          editorMessage = '';
        });

        optionEl.querySelector('[data-role="remove-option"]').addEventListener('click', () => {
          currentForm = service.removeOption(currentForm, qid, oid);
          editorMessage = '';
          draw();
        });
      });
    });

    editorEl.querySelectorAll('[data-role="add-after"]').forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => {
        currentForm = service.insertQuestionAfter(currentForm, buttonEl.dataset.qid);
        editorMessage = '';
        draw();
      });
    });

    editorEl.querySelectorAll('[data-role="add-new-question"]').forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => {
        currentForm = service.addQuestion(currentForm);
        editorMessage = '';
        draw();
      });
    });

    editorEl.querySelector('[data-role="save-form"]').addEventListener('click', async () => {
      await service.saveForm(currentForm);
      editorMessage = 'フォームを保存しました。';
      draw();
    });

    editorEl.querySelector('[data-role="back-dashboard"]').addEventListener('click', () => {
      editorMessage = '';
      navigate('dashboard');
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

    root.querySelector('#answerForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!currentForm) return;
      const validation = service.validateResponse(currentForm, currentResponse);
      validationErrors = validation.errors;
      if (!validation.isValid) {
        draw();
        return;
      }

      await service.submit(currentForm.id, currentResponse);
      submittedMessage = '回答を送信しました。ご協力ありがとうございます。';
      currentForm.questions.forEach((question) => {
        delete currentResponse[question.id];
      });
      validationErrors = {};
      draw();
    });
  };

  const bindDashboardEvents = () => {
    root.querySelector('[data-role="create-form"]')?.addEventListener('click', () => {
      currentForm = service.createEmptyForm();
      editorMessage = '';
      submittedMessage = '';
      validationErrors = {};
      navigate('builder', currentForm.id);
    });

    root.querySelectorAll('[data-role="open-edit"]').forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => navigate('builder', buttonEl.dataset.formId));
    });

    root.querySelectorAll('[data-role="open-answer"]').forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => openAnswerUrl(buttonEl.dataset.formId));
    });

    root.querySelectorAll('[data-role="copy-answer-url"]').forEach((buttonEl) => {
      buttonEl.addEventListener('click', async () => {
        editorMessage = await copyAnswerUrl(buttonEl.dataset.formId);
        draw();
      });
    });

    root.querySelectorAll('[data-role="open-results"]').forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => navigate('results', buttonEl.dataset.formId));
    });
  };

  const bindResultsEvents = () => {
    root.querySelector('[data-role="back-dashboard"]')?.addEventListener('click', () => {
      navigate('dashboard');
    });
  };

  const draw = async () => {
    const { page, formId } = parseRoute();
    if (['builder', 'answer', 'results'].includes(page) && formId) {
      const canUseUnsavedDraft =
        page === 'builder' &&
        currentForm &&
        currentForm.id === formId;

      if (!canUseUnsavedDraft) {
        try {
          currentForm = await service.loadForm(formId);
        } catch {
          currentForm = null;
        }
      }
    }

    const isAnswerPage = page === 'answer';
    root.innerHTML = isAnswerPage
      ? `
        <main class="app app-answer-only">
          <div class="page-shell" id="pageContent"></div>
        </main>
      `
      : `
        <main class="app">
          <header class="hero">
            <p class="eyebrow">アンケートフォーム</p>
            <h1>アンケート管理システム</h1>
            <p class="lead">管理者向けにフォームの作成・編集・集計、回答者向けに入力・送信を提供します。</p>
          </header>
          <div class="page-shell" id="pageContent"></div>
        </main>
      `;

    const pageContent = root.querySelector('#pageContent');

    if (page === 'dashboard') {
      pageContent.innerHTML = `${await renderDashboardPage()}${editorMessage ? `<p class="dashboard-message">${escapeHtml(editorMessage)}</p>` : ''}`;
      bindDashboardEvents();
      return;
    }

    if (page === 'builder') {
      pageContent.innerHTML = renderBuilderPage();
      bindBuilderEvents();
      return;
    }

    if (page === 'answer') {
      pageContent.innerHTML = renderAnswerPage();
      bindAnswerEvents();
      return;
    }

    if (page === 'results') {
      pageContent.innerHTML = await renderResultsPage();
      bindResultsEvents();
    }
  };

  window.addEventListener('hashchange', draw);
  if (!window.location.hash) {
    window.location.hash = '#/dashboard';
  }
  draw();
}
