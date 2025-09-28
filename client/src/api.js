import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

const client = axios.create({ baseURL: API_BASE })

export default client
