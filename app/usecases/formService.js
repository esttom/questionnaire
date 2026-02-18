export class FormService {
  constructor(repository) {
    this.repository = repository;
  }

  loadForms() {
    return this.repository.getForms();
  }

  loadForm(formId) {
    return this.repository.getForm(formId);
  }

  saveForm(form) {
    return this.repository.saveForm(form);
  }

  createEmptyForm() {
    return {
      id: this.nextFormId(),
      title: '',
      description: '',
      questions: []
    };
  }

  submit(formId, response) {
    return this.repository.submitResponse(formId, response);
  }

  loadResponses(formId) {
    return this.repository.getResponses(formId);
  }

  summarizeResponses(form, responses) {
    return {
      totalResponses: responses.length,
      questions: form.questions.map((question) => this.summarizeQuestion(question, responses))
    };
  }

  summarizeQuestion(question, responses) {
    const rawAnswers = responses.map((response) => response[question.id]);

    if (question.type === 'text') {
      const answeredTexts = rawAnswers
        .filter((value) => typeof value === 'string' && value.trim() !== '')
        .map((value) => value.trim());

      return {
        id: question.id,
        type: question.type,
        title: question.title,
        required: question.required,
        answeredCount: answeredTexts.length,
        unansweredCount: responses.length - answeredTexts.length,
        recentAnswers: answeredTexts.slice(-5).reverse()
      };
    }

    const optionCounts = (question.options || []).map((option) => ({
      label: option.label,
      count: 0
    }));

    rawAnswers.forEach((value) => {
      if (question.type === 'singleChoice') {
        const target = optionCounts.find((item) => item.label === value);
        if (target) target.count += 1;
        return;
      }

      if (!Array.isArray(value)) {
        return;
      }

      value.forEach((selected) => {
        const target = optionCounts.find((item) => item.label === selected);
        if (target) target.count += 1;
      });
    });

    const answeredCount = rawAnswers.filter((value) =>
      question.type === 'singleChoice'
        ? typeof value === 'string' && value !== ''
        : Array.isArray(value) && value.length > 0
    ).length;

    return {
      id: question.id,
      type: question.type,
      title: question.title,
      required: question.required,
      answeredCount,
      unansweredCount: responses.length - answeredCount,
      optionCounts
    };
  }

  validateResponse(form, response) {
    const errors = {};

    form.questions.forEach((question) => {
      const value = response[question.id];
      if (!question.required) {
        return;
      }

      if (question.type === 'text') {
        if (typeof value !== 'string' || value.trim() === '') {
          errors[question.id] = '必須項目です。入力してください。';
        }
        return;
      }

      if (question.type === 'singleChoice') {
        if (typeof value !== 'string' || value === '') {
          errors[question.id] = '必須項目です。1つ選択してください。';
        }
        return;
      }

      if (!Array.isArray(value) || value.length === 0) {
        errors[question.id] = '必須項目です。1つ以上選択してください。';
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  updateFormMeta(form, patch) {
    return { ...form, ...patch };
  }

  addQuestion(form, type = 'singleChoice') {
    return {
      ...form,
      questions: [...form.questions, this.createQuestion(type)]
    };
  }

  insertQuestionAfter(form, afterQuestionId, type = 'singleChoice') {
    const insertIndex = form.questions.findIndex((question) => question.id === afterQuestionId);
    if (insertIndex < 0) {
      return this.addQuestion(form, type);
    }

    const nextQuestion = this.createQuestion(type);
    return {
      ...form,
      questions: [
        ...form.questions.slice(0, insertIndex + 1),
        nextQuestion,
        ...form.questions.slice(insertIndex + 1)
      ]
    };
  }

  removeQuestion(form, questionId) {
    return {
      ...form,
      questions: form.questions.filter((question) => question.id !== questionId)
    };
  }

  updateQuestion(form, questionId, patch) {
    return {
      ...form,
      questions: form.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question
      )
    };
  }

  changeQuestionType(form, questionId, nextType) {
    return {
      ...form,
      questions: form.questions.map((question) => {
        if (question.id !== questionId) return question;
        if (nextType === 'text') {
          return { ...question, type: nextType, options: undefined };
        }

        const normalizedOptions = (question.options || []).length
          ? question.options
          : [
              { id: this.nextEntityId('opt'), label: '選択肢1' },
              { id: this.nextEntityId('opt'), label: '選択肢2' }
            ];

        return {
          ...question,
          type: nextType,
          options: normalizedOptions
        };
      })
    };
  }

  addOption(form, questionId) {
    return {
      ...form,
      questions: form.questions.map((question) => {
        if (question.id !== questionId || question.type === 'text') return question;
        const optionCount = (question.options || []).length + 1;
        return {
          ...question,
          options: [...(question.options || []), { id: this.nextEntityId('opt'), label: `選択肢${optionCount}` }]
        };
      })
    };
  }

  updateOption(form, questionId, optionId, label) {
    return {
      ...form,
      questions: form.questions.map((question) => {
        if (question.id !== questionId || !question.options) return question;
        return {
          ...question,
          options: question.options.map((option) =>
            option.id === optionId ? { ...option, label } : option
          )
        };
      })
    };
  }

  removeOption(form, questionId, optionId) {
    return {
      ...form,
      questions: form.questions.map((question) => {
        if (question.id !== questionId || !question.options) return question;
        return {
          ...question,
          options: question.options.filter((option) => option.id !== optionId)
        };
      })
    };
  }

  createQuestion(type) {
    const questionId = this.nextEntityId('q');
    const baseQuestion = {
      id: questionId,
      title: '新しい質問',
      required: false,
      type
    };

    if (type === 'text') {
      return baseQuestion;
    }

    return {
      ...baseQuestion,
      options: [
        { id: this.nextEntityId('opt'), label: '選択肢1' },
        { id: this.nextEntityId('opt'), label: '選択肢2' }
      ]
    };
  }

  nextEntityId(prefix) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  nextFormId() {
    return `form-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }
}
