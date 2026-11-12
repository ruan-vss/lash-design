import { ZodError } from 'zod';

/**
 * Middleware que valida body, query e params usando Zod
 */
export const validate = (schemas = {}) => {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body ?? {});
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query ?? {});
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params ?? {});
      }
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message
        }));
        return res.status(400).json({
          error: true,
          message: issues[0]?.message || 'Dados de entrada inválidos.',
          details: issues
        });
      }
      return next(error);
    }
  };
};