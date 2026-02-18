import { QuestionnaireRepository } from './questionnaireRepository.js';

/** @extends {QuestionnaireRepository} */
export class InMemoryQuestionnaireRepository extends QuestionnaireRepository {
  /** @param {import('../domain/formModels.js').FormDefinition[]} seedForms */
  constructor(seedForms) {
    super();
    this.forms = new Map(seedForms.map((form) => [form.id, structuredClone(form)]));
    this.responsesByForm = new Map(seedForms.map((form) => [form.id, []]));
  }

  async getForms() {
    return Array.from(this.forms.values()).map((form) => structuredClone(form));
  }

  async getForm(formId) {
    const form = this.forms.get(formId);
    if (!form) throw new Error('Form not found');
    return structuredClone(form);
  }

  async saveForm(form) {
    this.forms.set(form.id, structuredClone(form));
    if (!this.responsesByForm.has(form.id)) {
      this.responsesByForm.set(form.id, []);
    }
  }

  async submitResponse(formId, response) {
    if (!this.forms.has(formId)) throw new Error('Form not found');
    const responses = this.responsesByForm.get(formId) || [];
    responses.push(structuredClone(response));
    this.responsesByForm.set(formId, responses);
  }

  async getResponses(formId) {
    if (!this.forms.has(formId)) throw new Error('Form not found');
    return structuredClone(this.responsesByForm.get(formId) || []);
  }
}
