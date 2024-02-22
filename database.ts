const { Pool } = require('pg');

export const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Balance',
  password: 'user3@123',
  port: 5432, // or your PostgreSQL port
});

async function queryTables() {
    let client;
    try {
      client = await pool.connect(); // Connect to the pool
  
      // Retrieve a list of tables in the Balance database
      const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_catalog = 'Balance'
      `);
  
      // Iterate over the list of tables and query each one
      for (const row of result.rows) {
        const tableName = row.table_name;
       // const queryResult = await client.query(`SELECT * FROM ${tableName}`);
        console.log(`Data from ${tableName}:`);
      }
    } catch (err) {
      console.error('Error executing query:', err);
    } 
  }
  
  // Call the async function
  queryTables()
    .then(() => console.log('Query completed successfully.'))
    .catch(error => console.error('Error occurred:', error));
  

