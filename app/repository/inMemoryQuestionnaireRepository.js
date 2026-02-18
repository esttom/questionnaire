import { QuestionnaireRepository } from './questionnaireRepository.js';

/** @extends {QuestionnaireRepository} */
export class InMemoryQuestionnaireRepository extends QuestionnaireRepository {
  /** @param {import('../domain/formModels.js').FormDefinition[]} seedForms */
  constructor(seedForms) {
    super();
    this.storageKey = 'questionnaire-storage-v1';
    const persisted = this.loadPersistedData();
    const initialForms = persisted?.forms ?? seedForms;
    const initialResponses = persisted?.responsesByForm ?? seedForms.map((form) => [form.id, []]);

    this.forms = new Map(initialForms.map((form) => [form.id, structuredClone(form)]));
    this.responsesByForm = new Map(initialResponses.map(([formId, responses]) => [formId, structuredClone(responses)]));

    this.persist();
  }

  loadPersistedData() {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }

      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.forms) || !Array.isArray(parsed.responsesByForm)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  persist() {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }

      const payload = {
        forms: Array.from(this.forms.values()),
        responsesByForm: Array.from(this.responsesByForm.entries())
      };

      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {
      // localStorage が使えない環境ではメモリ上の挙動のみ継続する。
    }
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
    this.persist();
  }

  async submitResponse(formId, response) {
    if (!this.forms.has(formId)) throw new Error('Form not found');
    const responses = this.responsesByForm.get(formId) || [];
    responses.push(structuredClone(response));
    this.responsesByForm.set(formId, responses);
    this.persist();
  }

  async getResponses(formId) {
    if (!this.forms.has(formId)) throw new Error('Form not found');
    return structuredClone(this.responsesByForm.get(formId) || []);
  }
}
