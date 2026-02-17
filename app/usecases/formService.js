export class FormService {
  constructor(repository) {
    this.repository = repository;
    this.questionSequence = 100;
    this.optionSequence = 100;
  }

  loadForm(formId) {
    return this.repository.getForm(formId);
  }

  updateForm(form) {
    return this.repository.saveForm(form);
  }

  submit(formId, response) {
    return this.repository.submitResponse(formId, response);
  }

  updateFormMeta(form, patch) {
    return { ...form, ...patch };
  }

  addQuestion(form, type) {
    return {
      ...form,
      questions: [...form.questions, this.createQuestion(type)]
    };
  }

  insertQuestionAfter(form, afterQuestionId, type) {
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
              { id: this.nextOptionId(), label: '選択肢1' },
              { id: this.nextOptionId(), label: '選択肢2' }
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
          options: [...(question.options || []), { id: this.nextOptionId(), label: `選択肢${optionCount}` }]
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
    const questionId = this.nextQuestionId();
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
        { id: this.nextOptionId(), label: '選択肢1' },
        { id: this.nextOptionId(), label: '選択肢2' }
      ]
    };
  }

  nextQuestionId() {
    this.questionSequence += 1;
    return `q${this.questionSequence}`;
  }

  nextOptionId() {
    this.optionSequence += 1;
    return `o${this.optionSequence}`;
  }
}
