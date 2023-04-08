const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()

// middlewares
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors())

// routes
app.use((req, res, next) => {
  console.log("\n----------------------------------")
  console.log('URL ', req.url)
  console.log('BODY ', req.body)
  console.log('PARAMS', req.params)
  console.log('QUERY', req.query)
  next()
})

app.get('/', (req, res) => {
  res.send('Catálogo de Productos - Backend')
})

app.get('/api/items', (req, res) => {
  const { q } = req.query
  axios.get(`https://api.mercadolibre.com/sites/MLA/search?q=${q}`)
  .then(({ data }) => {
    const { values: categories } = data.filters.find(c => c.id === 'category') || data.available_filters.find(c => c.id === 'category')
    const dataResult = {
      categories: [
        ...categories.map((category) => {
          return category.name
        })
      ],
      items: [
        ...data.results.map((item) => {
          const [amount = 0, decimals = 0] = `${item.price}`.split('.')
          const [name = '', lastname = ''] = item.seller.nickname.split(' ')
          return {
            id: item.id,
            title: item.title,
            price: {
              currency: item.currency_id,
              amount,
              decimals
            },
            author: {
              name,
              lastname,
            },
            picture: item.thumbnail,
            condition: item.condition,
            free_shipping: item.shipping.free_shipping
          }
        })
      ]
    }
    res.json(dataResult).end()
  })
  .catch((error) => {
    console.log('ERROR in fetch: ' + error)
    res.status(500).json('Error al obtener la lista de items.').end()
  })
})

app.get('/api/items/:id', (req, res) => {
  const { id } = req.params
  axios
    .get(`https://api.mercadolibre.com/items/${id}`)
    .then(async ({ data }) => {
      const { data: seller } = await axios.get(
        `https://api.mercadolibre.com/users/${data.seller_id}`
      )

      const { data: description } = await axios.get(
        `https://api.mercadolibre.com/items/${id}/description`
      )

      const [name = '', lastname = ''] = seller.nickname.split(' ')
      const [amount = 0, decimals = 0] = `${data.price}`.split('.')
      const [width = 100, heigth = 100] = data.pictures[0].size.split('x')

      const dataResult = {
        author: {
          name,
          lastname,
        },
        item: {
          id: data.id,
          title: data.title,
          price: {
            currency: data.currency_id,
            amount,
            decimals,
          },
          sold_quantity: data.sold_quantity,
          picture: {
            url: data.pictures[0].url,
            size: {
              width,
              heigth
            }
          },
          condition: data.condition,
          free_shipping: data.shipping.free_shipping,
          sold_quantity: data.sold_quantity,
          description: description.plain_text,
        },
      }
      res.json(dataResult).end()
    })
    .catch((error) => {
      console.log('ERROR in fetch: ' + error)
      res.status(500).json('Error al obtener el item.').end()
    })
})

// main
app.listen(8080, () => console.log('Listening on port 8080!'))
