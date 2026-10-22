import app from './app.js'

app.listen(Number(process.env.SOFTY_PORT || 3001), process.env.SOFTY_BIND || '127.0.0.1', () => console.log('API de BRONMA y BRONMIA listas en el puerto', process.env.SOFTY_PORT || 3001))
