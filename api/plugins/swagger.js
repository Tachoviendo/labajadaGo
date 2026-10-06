import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

// Se debe registrar ANTES que las rutas para que las documente a todas.
export default fp(async function (fastify) {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'API Parcial',
        description: 'Documentacion generada con @fastify/swagger',
        version: '0.1.0',
      },
      components: {
        // Esto habilita el boton "Authorize" en /docs y el security: [{bearerAuth: []}] en las rutas
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  })
})
