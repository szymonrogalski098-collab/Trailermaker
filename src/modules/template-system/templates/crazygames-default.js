import { registerTemplate } from '../template-manager.js';

/**
 * Built-in default template for CrazyGames trailers. Every trailer built
 * from this template ends with the game logo and studio logo outro.
 * @type {import('../../../core/types.js').Template}
 */
export const crazygamesDefaultTemplate = {
  id: 'crazygames_default',
  name: 'CrazyGames Default',
  sceneBlueprint: [
    { start: 0, end: 4, media: '', text: '', transition: 'fade', effect: 'zoom' },
    { start: 4, end: 10, media: '', text: '', transition: 'glitch', effect: 'zoom' },
    { start: 10, end: 18, media: '', text: '', transition: 'glitch', effect: 'pan' },
  ],
  outro: { duration: 2, gameLogo: true, studioLogo: true },
};

registerTemplate(crazygamesDefaultTemplate);
