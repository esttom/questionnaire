export class FormService {
  constructor(repository) {
    this.repository = repository;
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
}
