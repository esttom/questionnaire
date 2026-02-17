import { QuestionnaireRepository } from './questionnaireRepository.js';

/** @extends {QuestionnaireRepository} */
export class InMemoryQuestionnaireRepository extends QuestionnaireRepository {
  /** @param {import('../domain/formModels.js').FormDefinition} seedForm */
  constructor(seedForm) {
    super();
    this.form = structuredClone(seedForm);
    this.responses = [];
  }

  async getForm(formId) {
    if (formId !== this.form.id) throw new Error('Form not found');
    return structuredClone(this.form);
  }

  async saveForm(form) {
    this.form = structuredClone(form);
  }

  async submitResponse(formId, response) {
    if (formId !== this.form.id) throw new Error('Form not found');
    this.responses.push(structuredClone(response));
  }

  async getResponses(formId) {
    if (formId !== this.form.id) throw new Error('Form not found');
    return structuredClone(this.responses);
  }
}
