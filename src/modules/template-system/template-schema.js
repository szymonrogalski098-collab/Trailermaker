/**
 * Structural validation for a Template object.
 * @param {import('../../core/types.js').Template} template
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateTemplateShape(template) {
  const errors = [];

  if (!template || typeof template !== 'object') {
    return { valid: false, errors: ['Template must be an object'] };
  }
  if (!template.id) errors.push('Template.id is required');
  if (!template.name) errors.push('Template.name is required');
  if (!Array.isArray(template.sceneBlueprint)) errors.push('Template.sceneBlueprint must be an array');
  if (!template.outro || typeof template.outro !== 'object') {
    errors.push('Template.outro is required');
  }

  return { valid: errors.length === 0, errors };
}
