/** @param {import('../usecases/formService.js').FormService} service */
export async function renderApp(service) {
  const root = document.getElementById('app');
  /** @type {import('../domain/formModels.js').FormDefinition|null} */
  let currentForm = null;
  const currentResponse = {};
  let validationErrors = {};
  let submittedMessage = '';
  let editorMessage = '';
  let builderErrors = [];
  let builderActiveTab = 'edit';
  let dashboardQuery = '';
  let dashboardStatusFilter = 'all';
  let formSaveState = 'saved';
  let isAnswerCompleted = false;
  let answerSessionFormId = '';
  const authStorageKey = 'questionnaire-auth-v1';

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
    const [page = 'login', formId = ''] = clean.split('/');
    if (!['login', 'dashboard', 'builder', 'answer', 'answer-complete', 'results'].includes(page)) {
      return { page: 'login', formId: '' };
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
      return `回答URLのコピーに失敗しました。手動でコピーしてください: ${answerUrl}`;
    }
  };

  const classifyFormStatus = (form) => form.status === 'published' ? 'published' : 'draft';

  const getBuilderWarnings = (form) => {
    const warnings = [];
    if (!String(form.title || '').trim()) warnings.push('タイトルが未入力です。');
    if (!Array.isArray(form.questions) || form.questions.length === 0) warnings.push('質問を1件以上追加してください。');

    (form.questions || []).forEach((question, index) => {
      if (!String(question.title || '').trim()) {
        warnings.push(`Q${index + 1} の質問文が未入力です。`);
      }
      if (question.type !== 'text') {
        const filledOptions = (question.options || []).filter((option) => String(option.label || '').trim() !== '').length;
        if (filledOptions < 2) warnings.push(`Q${index + 1} は選択肢を2件以上設定してください。`);
      }
    });

    return warnings;
  };

  const isQuestionAnswered = (question, value) => {
    if (question.type === 'text') {
      return typeof value === 'string' && value.trim() !== '';
    }
    if (question.type === 'singleChoice') {
      return typeof value === 'string' && value !== '';
    }
    return Array.isArray(value) && value.length > 0;
  };

  const renderLoginPage = () => `
    <section class="panel page-panel">
      <div class="page-headline">
        <h2>ログイン</h2>
      </div>
      <p class="preview-description">フォーム管理機能を利用するにはログインしてください。回答画面はログイン不要で利用できます。</p>
      <form id="loginForm" class="field-stack" autocomplete="off">
        <label class="field-block">ユーザーID<input id="loginUserId" placeholder="例: team-a-admin" required /></label>
        <div class="row-actions">
          <button class="btn btn-primary" type="submit">ログイン</button>
        </div>
      </form>
      ${editorMessage ? `<p class="dashboard-message">${escapeHtml(editorMessage)}</p>` : ''}
    </section>
  `;

  const renderDashboardPage = async () => {
    const forms = await service.loadForms();
    const filteredForms = forms.filter((form) => {
      const queryMatched = String(form.title || '（無題のフォーム）').toLowerCase().includes(dashboardQuery.toLowerCase().trim());
      const status = classifyFormStatus(form);
      const statusMatched = dashboardStatusFilter === 'all' || dashboardStatusFilter === status;
      return queryMatched && statusMatched;
    });

    return `
      <section class="panel page-panel">
        <div class="dashboard-head">
          <div>
            <h2>ダッシュボード</h2>
            <p class="preview-description">作成済みフォームの管理と回答受付を行います。</p>
            <div class="dashboard-filters">
              <label class="dashboard-filter-field">フォーム検索<input type="search" data-role="dashboard-query" value="${escapeHtml(dashboardQuery)}" placeholder="フォーム名で検索" /></label>
              <label class="dashboard-filter-field">表示状態
                <select data-role="dashboard-status-filter">
                  <option value="all" ${dashboardStatusFilter === 'all' ? 'selected' : ''}>すべて</option>
                  <option value="published" ${dashboardStatusFilter === 'published' ? 'selected' : ''}>公開中</option>
                  <option value="draft" ${dashboardStatusFilter === 'draft' ? 'selected' : ''}>下書き</option>
                </select>
              </label>
            </div>
          </div>
          <button class="btn btn-primary dashboard-create-btn" type="button" data-role="create-form">＋ 新規フォーム作成</button>
        </div>
        <div class="form-list">
          ${filteredForms.length
            ? filteredForms
                .map(
                  (form) => `
                    <article class="form-list-card">
                      <h3>${escapeHtml(form.title || '（無題のフォーム）')} <span class="status-chip status-chip-${classifyFormStatus(form)}">${classifyFormStatus(form) === 'published' ? '公開中' : '下書き'}</span></h3>
                      <p class="preview-description">質問数: ${form.questions.length}</p>
                      <div class="action-group">
                        <p class="action-group-title">管理</p>
                        <div class="row-actions">
                          <button class="btn btn-secondary" type="button" data-role="open-edit" data-form-id="${escapeHtml(form.id)}">編集する</button>
                          <button class="btn btn-ghost" type="button" data-role="open-results" data-form-id="${escapeHtml(form.id)}" ${classifyFormStatus(form) !== 'published' ? 'disabled' : ''}>集計を見る</button>
                        </div>
                      </div>
                      <div class="action-group">
                        <p class="action-group-title">回答受付</p>
                        <div class="row-actions">
                          <button class="btn btn-secondary" type="button" data-role="open-answer" data-form-id="${escapeHtml(form.id)}" ${classifyFormStatus(form) !== 'published' ? 'disabled' : ''}>回答画面を開く</button>
                          <button class="btn btn-ghost" type="button" data-role="copy-answer-url" data-form-id="${escapeHtml(form.id)}" ${classifyFormStatus(form) !== 'published' ? 'disabled' : ''}>回答URLをコピー</button>
                        </div>
                      </div>
                    </article>
                  `
                )
                .join('')
            : '<p class="preview-description">条件に一致するフォームがありません。検索条件を変更してください。</p>'}
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
        <div class="page-headline builder-headline">
          <h2>フォーム作成・編集</h2>
          <div class="row-actions builder-head-actions">
            <p class="save-state save-state-${formSaveState}">${formSaveState === 'saved' ? '保存済み' : formSaveState === 'error' ? '保存エラー' : '未保存'}</p>
            <p class="status-chip status-chip-${classifyFormStatus(form)}">${classifyFormStatus(form) === 'published' ? '公開中' : '下書き'}</p>
            <button class="btn btn-secondary" type="button" data-role="back-dashboard">ダッシュボードへ戻る</button>
          </div>
        </div>
        <div class="builder-tablist" role="tablist" aria-label="編集画面タブ">
          <button class="builder-tab ${builderActiveTab === 'edit' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${builderActiveTab === 'edit'}" data-role="builder-tab" data-tab="edit">編集</button>
          <button class="builder-tab ${builderActiveTab === 'preview' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${builderActiveTab === 'preview'}" data-role="builder-tab" data-tab="preview">プレビュー</button>
        </div>
        ${builderErrors.length
          ? `<section class="builder-error-panel" role="alert" aria-live="assertive"><p class="builder-error-title">公開前チェックで修正が必要です。</p><ul>${builderErrors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul></section>`
          : ''}
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
              ? `<div class="empty-question-state">
                  <p class="preview-description">質問がありません。最初の質問を追加してください。</p>
                  <button class="btn btn-secondary" type="button" data-role="add-first-question">＋ 質問を追加</button>
                </div>`
              : ''
          }
        </div>`
            : `${renderBuilderPreview()}
        <p class="preview-description">内容に問題がなければ「公開する」を押してください。</p>`
        }
        <div class="flow-actions builder-footer-actions">
          <button class="btn btn-secondary" type="button" data-role="save-draft">下書き保存</button>
          <button class="btn btn-primary" type="button" data-role="publish-form">公開する</button>
        </div>
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

    const answeredCount = form.questions.filter((question) => isQuestionAnswered(question, currentResponse[question.id])).length;
    const progress = form.questions.length === 0 ? 0 : Math.round((answeredCount / form.questions.length) * 100);

    return `
      <section class="panel page-panel">
        <div class="page-headline">
          <h2>フォーム回答画面</h2>
        </div>
        <h3>${escapeHtml(form.title || '（無題のフォーム）')}</h3>
        <p class="preview-description">${escapeHtml(form.description)}</p>
        <div class="answer-progress" aria-live="polite">
          <p class="preview-meta">回答進捗: ${answeredCount} / ${form.questions.length}</p>
          <div class="answer-progress-track"><div class="answer-progress-fill" style="width:${progress}%"></div></div>
        </div>
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

  const renderAnswerCompletePage = () => {
    const form = currentForm;
    if (!form) return '<section class="panel page-panel"><p>フォームが見つかりません。</p></section>';
    return `
      <section class="panel page-panel complete-card">
        <div class="page-headline">
          <h2>回答完了</h2>
        </div>
        <h3>${escapeHtml(form.title || '（無題のフォーム）')}</h3>
        <p class="preview-description">回答は正常に受け付けられました。ご協力ありがとうございました。</p>
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
    if (classifyFormStatus(form) !== 'published') {
      return `
        <section class="panel page-panel">
          <div class="page-headline">
            <h2>集計結果画面</h2>
            <button class="btn btn-secondary" type="button" data-role="back-dashboard">ダッシュボードへ戻る</button>
          </div>
          <p class="field-error">下書きフォームは集計を表示できません。公開後に確認してください。</p>
        </section>
      `;
    }

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
        editorMessage = '';
        draw();
      });
    });

    editorEl.querySelector('[data-role="back-dashboard"]').addEventListener('click', () => {
      editorMessage = '';
      builderErrors = [];
      navigate('dashboard');
    });

    const saveBuilderForm = async (status) => {
      if (!currentForm) return;
      const warnings = getBuilderWarnings(currentForm);
      if (status === 'published' && warnings.length > 0) {
        builderErrors = warnings;
        editorMessage = '公開前チェックでエラーがあります。内容を修正してから再度公開してください。';
        builderActiveTab = 'edit';
        formSaveState = 'unsaved';
        draw();
        return;
      }

      builderErrors = [];
      currentForm = service.updateFormMeta(currentForm, { status });
      try {
        await service.saveForm(currentForm);
        editorMessage = status === 'published' ? 'フォームを公開しました。' : 'フォームを下書き保存しました。';
        formSaveState = 'saved';
      } catch {
        editorMessage = status === 'published' ? 'フォームの公開に失敗しました。' : 'フォームの保存に失敗しました。';
        formSaveState = 'error';
      }
      draw();
    };

    editorEl.querySelector('[data-role="save-draft"]').addEventListener('click', async () => {
      await saveBuilderForm('draft');
    });

    editorEl.querySelector('[data-role="publish-form"]').addEventListener('click', async () => {
      await saveBuilderForm('published');
    });

    if (builderActiveTab !== 'edit') {
      return;
    }

    editorEl.querySelector('#titleInput').addEventListener('input', (event) => {
      currentForm = service.updateFormMeta(currentForm, { title: event.target.value });
      editorMessage = '';
      builderErrors = [];
      formSaveState = 'unsaved';
    });

    editorEl.querySelector('#descriptionInput').addEventListener('input', (event) => {
      currentForm = service.updateFormMeta(currentForm, { description: event.target.value });
      editorMessage = '';
      builderErrors = [];
      formSaveState = 'unsaved';
    });

    editorEl.querySelectorAll('.question-card').forEach((questionEl) => {
      const { qid } = questionEl.dataset;

      questionEl.querySelector('[data-role="question-title"]').addEventListener('input', (event) => {
        currentForm = service.updateQuestion(currentForm, qid, { title: event.target.value });
        editorMessage = '';
        builderErrors = [];
        formSaveState = 'unsaved';
      });

      questionEl.querySelector('[data-role="question-required"]').addEventListener('change', (event) => {
        currentForm = service.updateQuestion(currentForm, qid, { required: event.target.checked });
        editorMessage = '';
        builderErrors = [];
        formSaveState = 'unsaved';
        draw();
      });

      questionEl.querySelector('[data-role="question-type"]').addEventListener('change', (event) => {
        currentForm = service.changeQuestionType(currentForm, qid, event.target.value);
        delete currentResponse[qid];
        delete validationErrors[qid];
        editorMessage = '';
        builderErrors = [];
        formSaveState = 'unsaved';
        draw();
      });

      questionEl.querySelector('[data-role="remove-question"]').addEventListener('click', () => {
        currentForm = service.removeQuestion(currentForm, qid);
        delete currentResponse[qid];
        delete validationErrors[qid];
        editorMessage = '';
        builderErrors = [];
        formSaveState = 'unsaved';
        draw();
      });

      questionEl.querySelector('[data-role="add-option"]')?.addEventListener('click', () => {
        currentForm = service.addOption(currentForm, qid);
        editorMessage = '';
        builderErrors = [];
        formSaveState = 'unsaved';
        draw();
      });

      questionEl.querySelectorAll('.option-row').forEach((optionEl) => {
        const { oid } = optionEl.dataset;

        optionEl.querySelector('[data-role="option-label"]').addEventListener('input', (event) => {
          currentForm = service.updateOption(currentForm, qid, oid, event.target.value);
          editorMessage = '';
          builderErrors = [];
          formSaveState = 'unsaved';
        });

        optionEl.querySelector('[data-role="remove-option"]').addEventListener('click', () => {
          currentForm = service.removeOption(currentForm, qid, oid);
          editorMessage = '';
          builderErrors = [];
          formSaveState = 'unsaved';
          draw();
        });
      });
    });

    editorEl.querySelector('[data-role="add-first-question"]')?.addEventListener('click', () => {
      currentForm = service.addQuestion(currentForm);
      editorMessage = '';
      builderErrors = [];
      formSaveState = 'unsaved';
      draw();
    });

    editorEl.querySelectorAll('[data-role="add-after"]').forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => {
        currentForm = service.insertQuestionAfter(currentForm, buttonEl.dataset.qid);
        editorMessage = '';
        builderErrors = [];
        formSaveState = 'unsaved';
        draw();
      });
    });
  };

  const bindLoginEvents = () => {
    root.querySelector('#loginForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const userIdInput = root.querySelector('#loginUserId');
      try {
        const userId = service.login(userIdInput.value);
        localStorage.setItem(authStorageKey, userId);
        editorMessage = '';
        navigate('dashboard');
      } catch (error) {
        editorMessage = error instanceof Error ? error.message : 'ログインに失敗しました。';
        userIdInput.focus();
        draw();
      }
    });
  };

  const validateQuestionInteraction = (qid) => {
    if (!currentForm) return;
    const target = currentForm.questions.find((question) => question.id === qid);
    if (!target) return;
    const { errors } = service.validateResponse({ questions: [target] }, currentResponse);
    if (errors[qid]) {
      validationErrors[qid] = errors[qid];
    } else {
      delete validationErrors[qid];
    }
  };

  const bindAnswerEvents = () => {
    root.querySelectorAll('textarea[data-qid]').forEach((el) => {
      el.addEventListener('input', (event) => {
        const qid = event.target.dataset.qid;
        currentResponse[qid] = event.target.value;
        validateQuestionInteraction(qid);
      });

      el.addEventListener('blur', (event) => {
        validateQuestionInteraction(event.target.dataset.qid);
        draw();
      });
    });

    root.querySelectorAll('input[type="radio"]').forEach((el) => {
      el.addEventListener('change', (event) => {
        const qid = event.target.dataset.qid;
        currentResponse[qid] = event.target.value;
        validateQuestionInteraction(qid);
        draw();
      });
    });

    root.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      el.addEventListener('change', (event) => {
        const qid = event.target.dataset.qid;
        const current = Array.isArray(currentResponse[qid]) ? currentResponse[qid] : [];
        currentResponse[qid] = event.target.checked
          ? [...current, event.target.value]
          : current.filter((item) => item !== event.target.value);
        validateQuestionInteraction(qid);
        draw();
      });
    });

    root.querySelector('#answerForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!currentForm) return;
      const validation = service.validateResponse(currentForm, currentResponse);
      validationErrors = validation.errors;
      if (!validation.isValid) {
        const firstErrorQuestionId = Object.keys(validation.errors)[0];
        submittedMessage = `未回答の必須項目が ${Object.keys(validation.errors).length} 件あります。`;
        draw();
        setTimeout(() => {
          root.querySelector(`[data-qid="${firstErrorQuestionId}"]`)?.focus();
        }, 0);
        return;
      }

      await service.submit(currentForm.id, currentResponse);
      submittedMessage = '回答を送信しました。ありがとうございました。';
      validationErrors = {};
      window.alert('回答を送信しました。ご協力ありがとうございました。');
      isAnswerCompleted = true;
      navigate('answer-complete', currentForm?.id || '');
    });
  };

  const bindDashboardEvents = () => {
    root.querySelector('[data-role="dashboard-query"]')?.addEventListener('input', (event) => {
      dashboardQuery = event.target.value;
      draw();
    });

    root.querySelector('[data-role="dashboard-status-filter"]')?.addEventListener('change', (event) => {
      dashboardStatusFilter = event.target.value;
      draw();
    });

    root.querySelector('[data-role="create-form"]')?.addEventListener('click', () => {
      currentForm = service.createEmptyForm();
      editorMessage = '';
      submittedMessage = '';
      validationErrors = {};
      formSaveState = 'unsaved';
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

  const bindCommonEvents = () => {
    root.querySelector('[data-role="logout"]')?.addEventListener('click', () => {
      service.logout();
      localStorage.removeItem(authStorageKey);
      currentForm = null;
      editorMessage = '';
      navigate('login');
    });
  };

  const draw = async () => {
    const { page, formId } = parseRoute();
    const isLoggedIn = service.isLoggedIn();

    if (!isLoggedIn && page !== 'login' && page !== 'answer' && page !== 'answer-complete') {
      navigate('login');
      return;
    }

    if (isLoggedIn && page === 'login') {
      navigate('dashboard');
      return;
    }

    if ((page === 'answer' || page === 'answer-complete') && formId !== answerSessionFormId) {
      answerSessionFormId = formId;
      isAnswerCompleted = false;
      submittedMessage = '';
      validationErrors = {};
      Object.keys(currentResponse).forEach((questionId) => {
        delete currentResponse[questionId];
      });
    }

    if (['builder', 'answer', 'answer-complete', 'results'].includes(page) && formId) {
      const canUseUnsavedDraft =
        page === 'builder' &&
        currentForm &&
        currentForm.id === formId;

      if (!canUseUnsavedDraft) {
        try {
          currentForm = page === 'answer' || page === 'answer-complete'
            ? await service.loadPublicForm(formId)
            : await service.loadForm(formId);
        } catch {
          currentForm = null;
        }
      }
    }


    const isAnswerPage = page === 'answer' || page === 'answer-complete';
    root.innerHTML = isAnswerPage
      ? `
        <main class="app app-answer-only">
          <div class="page-shell" id="pageContent"></div>
        </main>
      `
      : `
        <main class="app">
          <header class="hero">
            <div class="hero-topline">
              <p class="eyebrow">アンケートフォーム</p>
              ${isLoggedIn ? `<button class="btn btn-ghost" type="button" data-role="logout">ログアウト</button>` : ''}
            </div>
            <h1>アンケート管理システム</h1>
            <p class="lead">管理者向けにフォームの作成・編集・集計、回答者向けに入力・送信を提供します。</p>
            ${isLoggedIn ? `<p class="preview-description">ログイン中: ${escapeHtml(service.getCurrentUserId())}</p>` : ''}
          </header>
          <div class="page-shell" id="pageContent"></div>
        </main>
      `;

    const pageContent = root.querySelector('#pageContent');

    if (page === 'login') {
      pageContent.innerHTML = renderLoginPage();
      bindLoginEvents();
      return;
    }

    if (page === 'dashboard') {
      pageContent.innerHTML = `${await renderDashboardPage()}${editorMessage ? `<p class="dashboard-message">${escapeHtml(editorMessage)}</p>` : ''}`;
      bindCommonEvents();
      bindDashboardEvents();
      return;
    }

    if (page === 'builder') {
      pageContent.innerHTML = renderBuilderPage();
      bindCommonEvents();
      bindBuilderEvents();
      return;
    }

    if (page === 'answer') {
      pageContent.innerHTML = renderAnswerPage();
      bindAnswerEvents();
      return;
    }

    if (page === 'answer-complete') {
      if (!isAnswerCompleted) {
        navigate('answer', formId);
        return;
      }
      pageContent.innerHTML = renderAnswerCompletePage();
      return;
    }

    if (page === 'results') {
      pageContent.innerHTML = await renderResultsPage();
      bindCommonEvents();
      bindResultsEvents();
    }
  };

  window.addEventListener('hashchange', draw);
  const storedUserId = localStorage.getItem(authStorageKey);
  if (storedUserId) {
    try {
      service.login(storedUserId);
    } catch {
      localStorage.removeItem(authStorageKey);
    }
  }

  if (!window.location.hash) {
    window.location.hash = '#/login';
  }
  draw();
}
