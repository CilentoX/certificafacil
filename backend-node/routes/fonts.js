import { listFonts, uploadFont, deleteFont } from '../controllers/fonts.js';

export default async function fontRoutes(fastify, options) {
    fastify.addHook("preValidation", fastify.authenticate);

    fastify.get('/', listFonts);
    fastify.post('/upload', uploadFont);
    fastify.delete('/:filename', deleteFont);
}
