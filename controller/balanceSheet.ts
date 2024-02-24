import { Response, Request, query } from "express";
import { pool } from "../../newBackend/database"
import { AccountDetails, BankDetails, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { comparePasswords, jwtAuth } from "../middelware/auth";
import { hashPassword } from "../middelware/auth"
import { executeUpdateBank, executeUpdateQuery, executeInsertQuery } from "../query/insertQuery";
import { Client } from "pg";
import { cli } from "winston/lib/winston/config";
// import { executeUpdateQuery } from "../query/insertQuery";

interface balance_sheet {
    sch_id?: number;
    sch_code: string;
    sch_description: string;
}

export const getBalanceSheet = async (req: Request, res: Response) => {
    const client = await pool.connect();
    const data = await client.query('SELECT * FROM bsschedule')
    if (data.rows.length > 0) {
        res.status(200).json({
            data: data.rows
        })
    } else {
        res.status(301).json({
            message: "data not found"
        })
    }
}

export const addSubData = async (req: Request, res: Response) => {

    const assets: balance_sheet = req.body;
    const title: string = assets.sch_description;
    const client = await pool.connect();

    try {
        const result = await client.query('SELECT * FROM bsschedule');

        let masterGroup: string | undefined

        let isMaster: boolean = false;

        const find = result.rows;

        if (req.body.master) {
            masterGroup = req.body.master.toUpperCase();
        } else {
            isMaster = true;
        }

        if (isMaster) {
            let titleExists2: boolean = false;
            find.forEach((ele: any) => {
                if (ele.sch_description === title.toUpperCase()) {
                    titleExists2 = true;
                }
            });

            if (titleExists2) {
                return res.status(400).json({ message: "Master name already exists" });
            }

            const codePrefix: string = title[0].toUpperCase();
            const codeSuffix: string = "01";
            await client.query('INSERT INTO bsschedule (sch_description, sch_code) VALUES ($1 , $2) RETURNING*', [title.toUpperCase(), codePrefix + codeSuffix])
            res.send(`${title} added successfully`);
        } else {
            let titleExists1: boolean = false;
            let masterCode1: string = "";
            for (const item of find) {
                if (item.sch_description === masterGroup) {
                    masterCode1 = item.sch_code;
                }
            }

            for (const item of find) {
                if (item.sch_code.includes(masterCode1)) {
                    if (item.sch_description === title.toUpperCase()) {
                        titleExists1 = true
                    }
                }
            }

            if (titleExists1) {
                return res.status(401).json({ message: "Master name already exists" });
            }

            let masterCode: string = "";
            for (const item of find) {
                if (item.sch_description === masterGroup) {
                    masterCode = item.sch_code;
                }
            }

            let subItemCount: number = 0;

            for (const item of find) {
                if (item.sch_code.includes(masterCode)) {
                    subItemCount++;
                }
            }

            if (subItemCount === 1) {
                const codePrefix: string = masterCode[0];
                const codeSuffix: string = masterCode.slice(1) + "01";
                await client.query('INSERT INTO bsschedule (sch_description, sch_code) VALUES ($1 , $2) RETURNING*', [title.toUpperCase(), codePrefix + codeSuffix])

                res.send(`${title} added to ${masterGroup} successfully`);
            } else if (subItemCount > 1) {
                const codePrefix: string = masterCode!;

                let itemCount: number = 0;

                for (const item of find) {
                    if (item.sch_code.includes(codePrefix)) {
                        itemCount++;
                    }
                }

                const intSuffix: number = itemCount;
                let intPrefix: number = 0;

                if (intSuffix > 9) {
                    intPrefix = intSuffix;

                    const code: string = `${codePrefix}${intPrefix}`;

                    await client.query('INSERT INTO bsschedule (sch_description, sch_code) VALUES ($1 , $2) RETURNING*', [title.toUpperCase(), code])

                    res.send(`${title} added to ${masterGroup} successfully`);
                } else {
                    const code: string = `${codePrefix}${intPrefix}${intSuffix}`;
                    await client.query('INSERT INTO bsschedule (sch_description, sch_code) VALUES ($1 , $2) RETURNING*', [title.toUpperCase(), code])
                    res.send(`${title} added to ${masterGroup} successfully`);
                }
            }
        }

    } catch (err) {
        return err
    }


};

export const deletBalaceSheet = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const match = await client.query("select * from bsschedule")
        let count: any = []
        for (const item of match.rows) {
            const querytext = "select * from accountmasterfile where account_ugroup = $1"
            const values = [item.sch_code];
            const result = await client.query(querytext, values);
            if (result.rowCount > 0) {
                count.push(item.sch_code)
            }
        }
        if (count.length > 0) {
            count.map(async (ele: any) => {
                const data = await client.query("DELETE FROM bsschedule WHERE sch_code !=$1", [ele])
                console.log(data.rows)
            })
            return res.status(204).send("Data deleted successfully and some are exist due to realtions with account section");
        } else {
            const data = await client.query("DELETE FROM bsschedule")
            if (data.rowCount > 0) {
                return res.status(204).send("Data deleted successfully");
            }
        }
    }
    catch (error) {
        console.error("Error deleting data:", error);
        return res.send(error)
    }


}

export const CreateAccount = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const data = req.body;

        if (!data.account_email || !data.account_phone) {
            return res.json({ message: "Some fields are missing" });
        }

        const find = await client.query(
            "SELECT * FROM accountmasterfile WHERE account_Email = $1 OR account_phone = $2",
            [data.account_email, data.account_phone]
        );


        if (find.rows.length > 0) {
            return res.json({ message: "Account_Email or Account_Phone already exist" });
        }

        const excludedField = 'bank';
        const { [excludedField]: excludedFieldValue, ...filteredData } = data;
        const key = Object.keys(data).filter(key => key !== excludedField);
        const values = Object.values(filteredData);
        const table = "accountmasterfile"
        const r = await executeInsertQuery(table, key, values);
        const add = r

        if (data.bank.length != 0) {
            for (let i = 0; i < data.bank.length; i++) {
                const g = await client.query(`INSERT INTO accountbanking (bank_name, bank_branch, bank_ifsc, bank_address, bank_upi, bank_state, bank_city, bank_pincode, bank_accountname, bank_accountnumber, bank_accounttype, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [data.bank[i].bank_name, data.bank[i].bank_branch, data.bank[i].bank_ifsc, data.bank[i].bank_address, data.bank[i].bank_upi, data.bank[i].bank_state, data.bank[i].bank_city, data.bank[i].bank_pincode, data.bank[i].bank_accountname, data.bank[i].bank_accountnumber, data.bank[i].bank_accounttype, add[0].account_id]);
            }
        }

        const f = await client.query(
            `SELECT accountmasterfile.account_description, bsschedule.sch_id, bsschedule.sch_description, bsschedule.sch_code  
             FROM accountmasterfile 
             JOIN bsschedule ON accountmasterfile.account_ugroup = bsschedule.sch_code
             WHERE accountmasterfile.account_ugroup = $1`,
            [add[0].account_ugroup]
        );


        const prefix = f.rows[f.rows.length - 1]?.sch_code

        const sufix = f.rows[f.rows.length - 1]?.account_description?.toUpperCase()

        const findCode = await client.query("select * from accountmasterfile")
        const a: any[] = [];

        for (const item of findCode.rows) {
            if (sufix) {
                if (item.account_shortname?.match(new RegExp(`${prefix}${sufix[0]}`))) {
                    a.push(item); // For example, pushing 'item' to array 'a'
                }
            }
        }

        a.sort((item1, item2) => item1.id - item2.id);
        const lastData = a[a.length - 1];
        const result = lastData?.account_shortname

        if (result) {
            const short = parseInt(result[result.length - 1]) + 1;
            let code: string = "";
            if (short > 9 || a.length > 9) {
                code = `${prefix}${sufix ? sufix[0] : ''}${a.length}`;
            } else {
                code = `${prefix}${sufix ? sufix[0] : ''}${"0"}${short}`;
            }

            const updateQuery = `
                        UPDATE accountmasterfile
                        SET "account_shortname" = $1
                        WHERE "account_id" = $2
                        RETURNING *
                    `;
            const values = [code, add[0].account_id];

            const update = await client.query(updateQuery, values);


            res.json({ message: "Data updated successfully", data: update.rows[update.rows.length - 1] });
        } else {
            const num = "01"
            const code = `${prefix}${sufix ? sufix[0] : ''}${num}`;
            const updateQuery = `
                        UPDATE accountmasterfile
                        SET "account_shortname" = $1
                        WHERE "account_id" = $2
                        RETURNING *
                    `;

            const values = [code, add[0].account_id];

            const update = await client.query(updateQuery, values);

            res.json({ message: "Data added successfully", data: update.rows[update.rows.length - 1] });
        }


    } catch (error) {
        console.error("Error creating account:", error);
        return res.status(500).json({ error });
    }
}

export const getdetails = async (req: Request, res: Response) => {

    const client = await pool.connect();

    client.query(`SELECT account_id, account_description, account_email, account_phone FROM accountmasterfile`)
        .then((data: any) => {
            const d = data.rows;
            return res.json(d)
        })
        .catch((error: any) => {
            console.error('Error fetching data:', error);
            return res.send(error)
        });
}

export const getBankDetails = async (req: Request, res: Response) => {
    const client = await pool.connect();
    client.query(`SELECT
        a.account_id,
        a.account_description,
        a.account_country,
        ab.bank_id,
        ab.bank_name,
        ab.bank_branch,
        ab.bank_ifsc,
        ab.bank_address,
        ab.bank_upi,
        ab.bank_state,
        ab.bank_city,
        ab.bank_pincode,
        ab.bank_accountname,
        ab.bank_accountnumber,
        ab.bank_accounttype
    FROM
        accountmasterfile AS a
    JOIN
        accountbanking AS ab ON a.account_id = ab.account_id;
    `)
        .then((data: any) => {
            const d = data.rows;
            return res.json(d)
        })
        .catch((error: any) => {
            console.error('Error fetching data:', error);
        });
    client.release()
}

export const getParents = async (req: Request, res: Response) => {
    const assets: balance_sheet = req.body

    const client = await pool.connect();

    const find = await client.query(`select * from bsschedule`)

    for (const item of find.rows) {
        if (item.sch_description === assets.sch_description.toUpperCase()) {
            let b
            let a = []
            b = item.sch_code

            const l = b.length

            for (let i = 2; i <= l; i += 2) {
                const f: string = b.slice(0, l - i); // Reduce the size of f by 2 in each iteration

                const find = await client.query(`select * from bsschedule where sch_code = $1`, [f])

                b = f

                if (find.rows.length > 0) {
                    a.push(find.rows[0]); // Push the first (and only) row into the array
                }
            }
            res.send(a.flat())
        }
    }


}


export const getAllBss = async (req: Request, res: Response) => {
    const client = await pool.connect();

    const find = await client.query(`select * from bsschedule`)
    let temp: any = []

    for (let i = 0; i < find.rows.length; i++) {
        if (typeof find.rows[i].sch_code === 'string' && typeof find.rows[i].sch_code[0] === 'string') {
            // Assuming find.rows[i].sch_code is a string and not an array
            if (find.rows[i].sch_code[0].match(new RegExp(find.rows[i].sch_code[0]))) {
                temp.push(find.rows[i]);
            }
        }
    }

    temp.sort((a: any, b: any) => a.sch_code.length - b.sch_code.length);

    const codeArrays: { [key: string]: any[] } = {};

    temp.forEach((obj: any) => {
        const codePrefix = obj.sch_code.charAt(0);
        if (!codeArrays[codePrefix]) {
            codeArrays[codePrefix] = [];
        }
        codeArrays[codePrefix].push(obj);
    });


    function sortBySchCode(a: any, b: any): number {
        if (a.sch_code.length !== b.sch_code.length) {
            return a.sch_code.length - b.sch_code.length;
        }
        const lastCharA = Number(a.sch_code.slice(-1));
        const lastCharB = Number(b.sch_code.slice(-1));
        return lastCharA - lastCharB;
    }

    // Sort each array within codeArrays
    for (const key in codeArrays) {
        codeArrays[key].sort(sortBySchCode);
    }

    let dict : any = {}

    for (const key of Object.keys(codeArrays)) {
        for (const item of codeArrays[key]) {
            let b
            b = item.sch_code
            const l = b.length

            for (let i = 2; i <= l; i += 2) {
                const f: string = b.slice(0, l - i); // Reduce the size of f by 2 in each iteration

                const parent = await client.query(`select * from bsschedule where sch_code = $1`, [f])
                
                b = f

                if (parent.rows.length > 0) {
                    const key = parent.rows[0].sch_code
                    const child = await client.query(`select * from bsschedule where sch_code = $1`, [item.sch_code])
                    if(child.rows.length > 0){
                        if (!(key in dict)) {
                            // If the key does not exist, create a new array with the value
                            dict[key] = [child.rows[0]];
                        }
                        // Add the value to the array
                        dict[key].push(child.rows[0]);
                    }
                    
                }
            }
        }

    }
    const result = [];
    for (let key in dict) {
        if (dict.hasOwnProperty(key)) {
            result.push({ key: key, value: dict[key] });
        }
    }
    res.send(result)
}

export const getAccountDetailsById = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const id = parseInt(req.params.id)
        if (!id) {
            return res.status(400).json({
                message: "Enter the valid id",
                code: 400,
                status: false
            })
        } else {
            // const data = await client.query(`SELECT accountmasterfile.account_description, bsschedule.sch_description, bsschedule.sch_code  
            // FROM accountmasterfile 
            // JOIN bsschedule ON accountmasterfile.account_ugroup = bsschedule.sch_id 
            // WHERE accountmasterfile.account_ugroup = ${id}`,
            // )
            const data = await client.query(`SELECT * 
            FROM accountmasterfile
            WHERE accountmasterfile.account_id = ${id}`,
            )
            let bank: any[] = []
            const f = await client.query(`select * from accountbanking where account_id = ${id}`)
            bank.push(f.rows)
            bank = bank.flat()
            if (!data.rows) {
                return res.status(301).json({
                    code: 301,
                    message: "data not found",
                    status: false
                })
            } else if (data.rows) {
                return res.status(200).json({
                    data: { ...data.rows[0], bank }
                });
            }
        }
    } catch (err) {
        res.status(500).json({ err });
    }

}

export const CreateUser = async (req: Request, res: Response) => {

    const client = await pool.connect();

    const data = req.body

    const hashedPassword = await hashPassword(data.password);
    try {

        const find = await client.query(`select * from user_details where user_name = $1`, [data.user_name])

        if (find.rows.length > 0) {
            return res.json({ message: "user already exist" })
        } else {
            const details = await client.query(`INSERT INTO user_details (user_name, user_password, isadmin) VALUES ($1, $2, $3)  RETURNING *`, [data.user_name, hashedPassword, data.isadmin])
            return res.status(201).json({
                message: "User created ..",
                code: 201,
                data: details.rows
            })
        }

    } catch (err) {
        return res.status(500).json({
            message: err,
            code: 500,
        })
    }

}

export const login = async (req: Request, res: Response) => {
    const client = await pool.connect();
    const data = req.body

    const find = await client.query(`select * from user_details where user_name = $1`, [data.user_name])

    if (find.rows.length > 0) {
        const passwordMatches = await comparePasswords(data.password, find.rows[0].user_password);
        if (passwordMatches) {
            const payload = {
                user_name: data.user_name
            }
            const token = await jwtAuth(payload)

            return res.status(200).json({
                message: "Login Successfully..",
                data: {
                    user_name: data.user_name,
                    isadmin: find.isadmin,
                    token: token
                },
            })
        } else {
            return res.status(401).json({
                message: "Incorrect Password",
            })
        }

    } else {
        return res.status(401).json({
            message: "data not found ..",
            code: 401,
        })
    }

}

export const getSelectedAccountData = async (req: Request, res: Response) => {

    const client = await pool.connect();

    const data = await client.query(`select account_id, account_shortname, account_bgroup, account_ugroup, account_email, account_address, account_web, account_phone, account_country, account_description  from accountmasterfile`)
    return res.status(200).json({
        data: data.rows,
        code: 200
    })

}

export const deleteAccountDetail = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const dataArray: number[] = req.body.dataArray;
        const deletionPromises = dataArray.map(async (element) => {
            await client.query(`delete from accountmasterfile where account_id = $1 `, [element])
            await client.query(`DELETE FROM accountbanking
            WHERE account_id = $1
            RETURNING *;`, [element])
        });
        await Promise.all(deletionPromises);
        res.status(200).json({ message: 'Account details deleted successfully.' });
    } catch (error) {
        // Handle any errors
        console.error('Error deleting account details:', error);
        res.status(500).json({ error });
    }
}

export const updateAccount = async (req: Request, res: Response) => {
    try {
        const data = req.body
        const excludedFields = ['account_id', 'bank'];
        const filteredData = Object.keys(data)
            .filter((key: string) => !excludedFields.includes(key))
            .reduce((obj: any, key: string) => {
                obj[key] = data[key];
                return obj;
            }, {});
        // Extract field names and values from the filtered data object
        const fieldsToUpdate = Object.keys(filteredData);
        const values = Object.values(filteredData);
        const r = await executeUpdateQuery(fieldsToUpdate, values, "account_id", data.account_id);
        const bankData = data.bank; // Assuming 'bank' is the array of bank details
        if (bankData) {
            const d = await executeUpdateBank(bankData, data.account_id);
            return res.json({ message: "data updated successfully", data: { r, d } })
        } else {
            return res.json({ message: "data updated successfully", data: r })
        }

    } catch (error) {
        // res.status(500).json({ error: 'Internal server error' });
        res.status(500).json(error)
    }
}

export const deleteBankObject = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const dataArray: number[] = req.body.dataArray;
        const deletionPromises = dataArray.map(async (element) => {
            await client.query(`delete from accountbanking where account_id = $1 `, [element])
        });
        await Promise.all(deletionPromises);
    } catch (err) {
        return res.send(err)
    }
}

export const addSeiveMaster = async (req: Request, res: Response) => {
    try {
        const data = req.body
        const key = Object.keys(data)
        const values = Object.values(data)
        const table = "stonemaster"
        const result = await executeInsertQuery(table, key, values)
        return res.status(201).json({ message: "data added ...", data: result })
    } catch (err) {
        return err
    }
}

export const getSeiveMasterdetails = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const find = req.body

        if (find && Object.keys(find).includes(find.stone_id)) {
            const data = await client.query("select * from stonemaster where stone_id =$1", [find.stone_id])
            if (data.rows.length > 0) {
                return res.status(200).json({ data: data.rows })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        } else {
            const data = await client.query("select * from stonemaster")
            if (data.rows.length > 0) {
                return res.status(200).json({ data: data.rows })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        }

    } catch (err) {
        return err
    }
}

export const addShape = async (req: Request, res: Response) => {

    const data = req.body
    try {
        const table = "stoneshapefile"
        const key = Object.keys(data)
        const values = Object.values(data)
        const result = await executeInsertQuery(table, key, values)
        if (result) {
            return res.status(200).json({ data: result })
        } else {
            return res.status(301).json({ message: "data not found" })
        }

    } catch (err) {
        return err
    }
}

export const getStoneShape = async (req: Request, res: Response) => {
    const client = await pool.connect();
    const find = req.body
    try {
        if (find && find.stn_serial) {
            const data = await client.query("select * from stoneshapefile where stn_serial =$1", [find.stn_serial])
            if (data.rows.length > 0) {
                return res.status(200).json({ data: data.rows })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        } else {
            const data = await client.query("select * from stoneshapefile")
            if (data.rows.length > 0) {
                return res.status(200).json({ data: data.rows })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        }
    } catch (err) {
        return err
    }
}

export const addStoneColor = async (req: Request, res: Response) => {

    const data = req.body
    try {
        const table = "stonecolorfile"
        const key = Object.keys(data)
        const values = Object.values(data)
        const result = await executeInsertQuery(table, key, values)
        if (result) {
            return res.status(200).json({ data: result })
        } else {
            return res.status(301).json({ message: "data not found" })
        }

    } catch (err) {
        return err
    }
}

export const getStoneColor = async (req: Request, res: Response) => {
    const client = await pool.connect();
    const find = req.body
    try {
        if (find && find.stn_serial) {
            const data = await client.query("select * from stonecolorfile where stn_serial =$1", [find.stn_serial])
            if (data.rows.length > 0) {
                return res.status(200).json({ data: data.rows })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        } else {
            const data = await client.query("select * from stonecolorfile")
            if (data.rows.length > 0) {
                return res.status(200).json({ data: data.rows })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        }
    } catch (err) {
        return err
    }
}