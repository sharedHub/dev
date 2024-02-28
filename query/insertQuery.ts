import { QueryResult } from 'pg';
import { sql } from "../../newBackend/database"
import { Request, Response } from 'express';

export const executeInsertQuery = async (table: string, fieldsToInsert: string[], values: any[], req: Request, res: Response): Promise<any[]> => {
    try {
        // Execute the query
        const placeholders = fieldsToInsert.map((field, index) => `$${index + 1}`).join(', ');
        const fieldNames = fieldsToInsert.join(', ');
        const insertQuery = `
            INSERT INTO ${table} (${fieldNames})
            VALUES (${placeholders})
            RETURNING *
        `;
        const result = await sql.unsafe(insertQuery, values);
        return result;
    } catch (error) {
        // Handle errors
       
        throw error
    
    }
};

export const executeUpdateQuery = async (table : string, fieldsToUpdate: string[], values: any[], conditionField: string, conditionValue: any): Promise<any[]> => {
    try {
        // Generate SET clause dynamically based on fieldsToUpdate
        const setClause = fieldsToUpdate.map((field, index) => `${field} = $${index + 1}`).join(', ');
        // Define the update query
        const updateQuery: string = `
        UPDATE ${table}
        SET ${setClause}
        WHERE ${conditionField} = $${fieldsToUpdate.length + 1}
        RETURNING *`;
        // Execute the query
        const result = await sql.unsafe(updateQuery, [...values, conditionValue]);
        return result;

    } catch (error) {
        // Handle errors
        console.error('Error executing update query:', error);
        throw error;
    }
}

export const executeUpdateBank = async (bankData: any[], account_id: string, req: Request, res: Response): Promise<any[]> => {
    try {
        const results: any[] = [];

        for (const item of bankData) {
            if (Object.keys(item).includes('bank_id')) {
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
                const rows = await sql.unsafe(updateQuery, updateValues);
                results.push(...rows);
            } else {
                const fieldNames = Object.keys(item).join(', ');
                const placeholders = Object.keys(item).map((_, index) => `$${index + 1}`).join(', ');
                const values : any = Object.values(item);
                const insertQuery = `
                    INSERT INTO accountbanking (${fieldNames})
                    VALUES (${placeholders})
                    RETURNING *
                    `;
                    const rows = await sql.unsafe(insertQuery, values);
                results.push(...rows);
            }
        }
        return results;
    } catch (error) {
        console.error("Error updating bank details:", error);
        throw error;
    }
}


