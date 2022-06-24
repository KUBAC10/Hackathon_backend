// get fields to translate by collection name
export default function getLocalizationFields(collection) {
  switch (collection) {
    case 'Survey': return [
      'name',
      'description',
      'footer.text',
      'footer.content',
      'references.content'
    ];
    case 'SurveySection': return [
      'name',
      'description'
    ];
    case 'ContentItem': return [
      'text',
      'title',
      'html'
    ];
    case 'ContentItemElement': return [
      'linkText'
    ];
    case 'Question': return [
      'name',
      'description',
      'placeholder',
      'quizCorrectText',
      'quizIncorrectText',
      'linearScale.fromCaption',
      'linearScale.toCaption',
      'detractorsComment',
      'detractorsPlaceholder',
      'passivesComment',
      'passivesPlaceholder',
      'promotersComment',
      'promotersPlaceholder',
    ];
    case 'QuestionItem': return [
      'name',
      'quizResultText'
    ];
    case 'GridRow': return [
      'name'
    ];
    case 'GridColumn': return [
      'name'
    ];
    // return empty array
    default: return [];
  }
}
