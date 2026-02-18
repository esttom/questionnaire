import { InMemoryQuestionnaireRepository } from './inMemoryQuestionnaireRepository.js';

const seedForms = [
  {
    id: 'form-customer-voice',
    ownerId: 'demo-admin',
    title: '顧客満足度アンケート',
    description: 'ご利用体験の評価と改善要望を収集します。',
    questions: [
      {
        id: 'q1',
        title: '総合満足度を教えてください',
        required: true,
        type: 'singleChoice',
        options: [
          { id: 'q1o1', label: '非常に満足' },
          { id: 'q1o2', label: '満足' },
          { id: 'q1o3', label: '普通' },
          { id: 'q1o4', label: '不満' }
        ]
      },
      {
        id: 'q2',
        title: '評価したポイントを選択してください',
        required: false,
        type: 'multiChoice',
        options: [
          { id: 'q2o1', label: '操作性' },
          { id: 'q2o2', label: '表示速度' },
          { id: 'q2o3', label: 'サポート' }
        ]
      }
    ]
  }
];

export function createQuestionnaireRepository() {
  // 将来的にAPI版へ差し替える場合はここを変更するだけ。
  return new InMemoryQuestionnaireRepository(seedForms);
}
