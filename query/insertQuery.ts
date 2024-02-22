import { QueryResult } from 'pg';
import { pool } from "../../newBackend/database"

export const executeInsertQuery = async (fieldsToInsert: string[], values: any[]): Promise<any[]> => {
    try {
        // Execute the query
        const client = await pool.connect();
        const placeholders = fieldsToInsert.map((field, index) => `$${index + 1}`).join(', ');
        const fieldNames = fieldsToInsert.join(', ');
        const insertQuery = `
        INSERT INTO accountmasterfile (${fieldNames})
        VALUES (${placeholders})
        RETURNING *
         `;
        const result: QueryResult = await client.query(insertQuery, values);
        return result.rows;
    } catch (error) {
        // Handle errors
        console.error('Error executing insert query:', error);
        throw error;
    }
}


export const executeUpdateQuery = async (fieldsToUpdate: string[], values: any[], conditionField: string, conditionValue: any): Promise<any[]> => {
    try {
        // Generate SET clause dynamically based on fieldsToUpdate
        const setClause = fieldsToUpdate.map((field, index) => `${field} = $${index + 1}`).join(', ');
        // Define the update query
        const updateQuery: string = `
        UPDATE accountmasterfile
        SET ${setClause}
        WHERE ${conditionField} = $${fieldsToUpdate.length + 1}
        RETURNING *`;
        // Execute the query
        const client = await pool.connect();
        const result: QueryResult = await client.query(updateQuery, [...values, conditionValue]);
        return result.rows;
    } catch (error) {
        // Handle errors
        console.error('Error executing update query:', error);
        throw error;
    }
}

export const executeUpdateBank = async (bankData: any[], account_id: string): Promise<any[]> => {
    const client = await pool.connect();
    try {
        const results: any[] = [];

        for (const item of bankData) {
            const filteredKeys = Object.keys(item).filter(key => key !== 'bank_id');
            const setClause = filteredKeys.map((field, index) => `${field} = $${index + 1}`).join(', ');
            const values = filteredKeys.map(field => item[field]);

            const updateQuery = `
                UPDATE accountbanking
                SET ${setClause}
                WHERE account_id = $${values.length + 1} AND bank_id = $${values.length + 2}
                RETURNING *`;
            const updateValues = [...values, account_id, item.bank_id];

            // Execute the update query
            const { rows } = await client.query(updateQuery, updateValues);
            results.push(...rows);
        }

        return results;
    } catch (error) {
        console.error("Error updating bank details:", error);
        throw error;
    }
}