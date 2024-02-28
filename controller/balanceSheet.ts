import { Response, Request, query } from "express";
import { sql } from "../../newBackend/database"
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
    const data = await sql `SELECT * FROM bsschedule`
    if (data.length > 0) {
        res.status(200).json({
            data: data
        })
    } else {
        res.status(301).json({
            message: "data not found"
        })
    }
}

export const addParent = async (req: Request, res: Response) => {
    const title = req.body.master;
    
    const result = await sql `SELECT * FROM bsschedule`;

    const find = result;
    console.log(result)

    let titleExists2: boolean = false;
    find.forEach((ele: any) => {
        if (ele.sch_description === title.toUpperCase()) {
            titleExists2 = true;
        }
    });

    if (titleExists2) {
        return res.status(400).json({ message: "data already exists" });
    }

    const codePrefix: string = title[0].toUpperCase();
    const codeSuffix: string = "01";
    let itemCount: number = 0;
    for (const item of find) {
        if (item.sch_code.startsWith((codePrefix + codeSuffix)[0])) {
            itemCount++;
        }
    }
  
    if (itemCount > 0) {
        console.log("kl")
        const num = "0"
        const codePrefix: string = title[0].toUpperCase();
        const codeSuffix: string = `${num}${itemCount + 1}`;
        await sql `INSERT INTO bsschedule (sch_description, sch_code)VALUES (${title.toUpperCase()}, ${codePrefix + codeSuffix}
            RETURNING *`;
            
    } else {
        await sql `
            INSERT INTO bsschedule (sch_description, sch_code)
            VALUES (${title.toUpperCase()}, ${codePrefix + codeSuffix})
            RETURNING *;
            `;
    }
    res.send(`${title} added successfully`)

}

export const addSubData = async (req: Request, res: Response) => {

    const assets: balance_sheet = req.body;
    const title: string = assets.sch_description;

    try {
        const result = await sql `SELECT * FROM bsschedule`;

        let masterGroup

        let isMaster: boolean = false;

        const find = result;

        // if (req.body.master) {
        masterGroup = req.body.master.toUpperCase();
        const parent = await sql `select * from bsschedule where sch_description = ${masterGroup}`
        if(parent.length === 0){
            return res.send("master not found")
        }
        // } else {
        //     isMaster = true;
        // }


        // let titleExists2: boolean = false;
        // find.forEach((ele: any) => {
        //     if (ele.sch_description === title.toUpperCase()) {
        //         titleExists2 = true;
        //     }
        // });

        // if (titleExists2) {
        //     return res.status(400).json({ message: "Master name already exists" });
        // }

        // const codePrefix: string = title[0].toUpperCase();
        // co   } else {nst codeSuffix: string = "01";
        // await client.query('INSERT INTO bsschedule (sch_description, sch_code) VALUES ($1 , $2) RETURNING*', [title.toUpperCase(), codePrefix + codeSuffix])
        // res.send(`${title} added successfully`);

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
            return res.status(401).json({ message: "child name already exists" });
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
            await sql `INSERT INTO bsschedule (sch_description, sch_code) VALUES (${title.toUpperCase()} , ${codePrefix + codeSuffix}) RETURNING*`,

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

                await sql `INSERT INTO bsschedule (sch_description, sch_code) VALUES (${title.toUpperCase()} , ${code}) RETURNING*`,

                res.send(`${title} added to ${masterGroup} successfully`);
            } else {
                const code: string = `${codePrefix}${intPrefix}${intSuffix}`;
                await sql `INSERT INTO bsschedule (sch_description, sch_code) VALUES (${title.toUpperCase()} , ${code}) RETURNING*`,
                res.send(`${title} added to ${masterGroup} successfully`);
            }
        }


    } catch (err) {
        return err
    }


};

export const deletBalaceSheet = async (req: Request, res: Response) => {
    try {
        const match = await sql `select * from bsschedule`
        let count: any = []
        for (const item of match) {
            const querytext = "SELECT * FROM accountmasterfile WHERE account_ugroup = $1";
            const values = [item.sch_code];
            const result = await sql.unsafe(querytext, values);
            if (result.length > 0) {
                count.push(item.sch_code);
            }
        }
        if (count.length > 0) {
            count.map(async (ele: any) => {
                const data = await sql `DELETE FROM bsschedule WHERE sch_code !=${ele}`
            })
            return res.status(204).send("Data deleted successfully and some are exist due to realtions with account section");
        } else {
            const data = await sql `DELETE FROM bsschedule`
            if (data.length > 0) {
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
    try {
        const data = req.body;

        if (!data.account_email || !data.account_phone) {
            return res.json({ message: "Some fields are missing" });
        }

        const find = await sql`SELECT * FROM accountmasterfile WHERE account_Email = ${data.account_email} OR account_phone = ${data.account_phone}`

        if (find.length > 0) {
            return res.json({ message: "Account_Email or Account_Phone already exist" });
        }

        const excludedField = 'bank';
        const { [excludedField]: excludedFieldValue, ...filteredData } = data;
        const key = Object.keys(data).filter(key => key !== excludedField);
        const values = Object.values(filteredData);
        const table = "accountmasterfile"
        const r = await executeInsertQuery(table, key, values, req, res);
        const add = r

        if (data.bank.length != 0) {
            for (let i = 0; i < data.bank.length; i++) {
                const g = await sql `INSERT INTO accountbanking (bank_name, bank_branch, bank_ifsc, bank_address, bank_upi, bank_state, bank_city, bank_pincode, bank_accountname, bank_accountnumber, bank_accounttype, account_id) VALUES (${data.bank[i].bank_name}, ${ data.bank[i].bank_branch}, ${data.bank[i].bank_ifsc}, ${data.bank[i].bank_address}, ${data.bank[i].bank_upi}, ${data.bank[i].bank_state}, ${data.bank[i].bank_city}, ${data.bank[i].bank_pincode}, ${data.bank[i].bank_accountname}, ${data.bank[i].bank_accountnumber}, ${data.bank[i].bank_accounttype}, ${add[0].account_id})`
            }
        }

        const f = await sql 
            `SELECT accountmasterfile.account_description, bsschedule.sch_id, bsschedule.sch_description, bsschedule.sch_code  
             FROM accountmasterfile 
             JOIN bsschedule ON accountmasterfile.account_ugroup = bsschedule.sch_code
             WHERE accountmasterfile.account_ugroup = ${add[0].account_ugroup}`

             const prefix = f[f.length - 1]?.sch_code;

             const sufix = f[f.length - 1]?.account_description?.toUpperCase();
     
             const findCode = await sql`select * from accountmasterfile`;
             const a: any[] = [];
     

        for (const item of findCode) {
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

            const update = await sql`${updateQuery}, ${values}`;
            
            res.json({ message: "Data updated successfully", data: update[update.length - 1] });
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

     
            const update = await sql.unsafe(updateQuery, values);

            res.json({ message: "Data updated successfully", data: update[update.length - 1] });
        }


    } catch (error) {
        console.error("Error creating account:", error);
        return res.status(500).json({ error });
    }
}

export const getdetails = async (req: Request, res: Response) => {

   await sql `SELECT account_id, account_description, account_email, account_phone FROM accountmasterfile`
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

    sql`SELECT
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
    `
        .then((data: any) => {
            const d = data.rows;
            return res.json(d)
        })
        .catch((error: any) => {
            console.error('Error fetching data:', error);
        });
   
}

export const getParents = async (req: Request, res: Response) => {
    const assets: balance_sheet = req.body

    const find = await sql`select * from bsschedule`

    for (const item of find) {
        if (item.sch_description === assets.sch_description.toUpperCase()) {
            let b
            let a = []
            b = item.sch_code

            const l = b.length

            for (let i = 2; i <= l; i += 2) {
                const f: string = b.slice(0, l - i); // Reduce the size of f by 2 in each iteration

                const find = await sql`select * from bsschedule where sch_code = ${f}`

                b = f

                if (find.length > 0) {
                    a.push(find[0]); // Push the first (and only) row into the array
                }
            }
            res.send(a.flat())

        }
    }


}

export const getAllBss = async (req: Request, res: Response) => {
   
    const find = await sql `select * from bsschedule`;

    interface Item {
        sch_id: number;
        sch_code: string;
        sch_description: string;
        children?: Item[];
    }

    let transformedData: Item[] = [];

    find.forEach((item: any) => {
        let codes = item.sch_code;

        let currentLevel = transformedData;

        for (let i = 0; i < codes.length; i += 2) {
            let code = codes.slice(0, i + 3);

            let currentItem = currentLevel.find((el) => el.sch_code === code);
            if (!currentItem) {
                let newItem: Item = {
                    sch_id: item.sch_id,
                    sch_code: code,
                    sch_description: item.sch_description
                };
                currentItem = newItem;
                currentLevel.push(newItem);
            }

            if (!currentItem.children) {
                currentItem.children = [];
            }

            if (i === codes.length - 3) {
                let childItem = currentItem.children.find((child) => child.sch_code === item.sch_code);
                if (!childItem) {
                    currentItem.children.push({
                        sch_id: item.sch_id,
                        sch_code: item.sch_code,
                        sch_description: item.sch_description,
                        children: []
                    });
                }
            }

            if (currentItem.sch_code !== item.sch_code) {
                currentLevel = currentItem.children!;
            }
        }
    });

    res.json(transformedData);




}
export const getAccountDetailsById = async (req: Request, res: Response) => {
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
            const data = await sql `SELECT * 
            FROM accountmasterfile
            WHERE accountmasterfile.account_id = ${id}`
    
            let bank: any[] = []
            const f = await sql `select * from accountbanking where account_id = ${id}`
            bank.push(f)
            bank = bank.flat()
            if (!data) {
                return res.status(301).json({
                    code: 301,
                    message: "data not found",
                    status: false
                })
            } else if (data) {
                return res.status(200).json({
                    data: { ...data[0], bank }
                });
            }
        }
    } catch (err) {
        res.status(500).json({ err });
    }

}

export const CreateUser = async (req: Request, res: Response) => {
    const data = req.body

    const hashedPassword = await hashPassword(data.password);
    try {

        const find = await sql `select * from user_details where user_name = ${data.user_name}`

        if (find.length > 0) {
            return res.json({ message: "user already exist" })
        } else {
            const details = await sql `INSERT INTO user_details (user_name, user_password, isadmin) VALUES (${data.user_name}, ${hashedPassword}, ${data.isadmin})  RETURNING *`
            return res.status(201).json({
                message: "User created ..",
                code: 201,
                data: details
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
    const data = req.body

    const find = await sql `select * from user_details where user_name = ${data.user_name}`
    if (find.length > 0) {
        const passwordMatches = await comparePasswords(data.password, find[0].user_password);
        if (passwordMatches) {
            const payload = {
                user_name: data.user_name
            }
            const token = await jwtAuth(payload)

            return res.status(200).json({
                message: "Login Successfully..",
                data: {
                    user_name: data.user_name,
                    // isadmin: find.isadmin,
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

    const data = await sql `select account_id, account_shortname, account_bgroup, account_ugroup, account_email, account_address, account_web, account_phone, account_country, account_description  from accountmasterfile`
    return res.status(200).json({
        data: data,
        code: 200
    })

}

export const deleteAccountDetail = async (req: Request, res: Response) => {
    try {
        const dataArray: number[] = req.body.dataArray;
        const deletionPromises = dataArray.map(async (element) => {
            await sql `delete from accountmasterfile where account_id = ${element}`
            await sql `DELETE FROM accountbanking
            WHERE account_id = ${element}
            RETURNING *;`
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
        const table = "accountmasterfile"
        const r = await executeUpdateQuery(table, fieldsToUpdate, values, "account_id", data.account_id);
        const bankData = data.bank; // Assuming 'bank' is the array of bank details
        if (bankData) {
            const d = await executeUpdateBank(bankData, data.account_id, req, res);
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
    try {
        const dataArray: number[] = req.body.dataArray;
        const deletionPromises = dataArray.map(async (element) => {
            await sql `delete from accountbanking where account_id = ${element}`
        });
        await Promise.all(deletionPromises);
    } catch (err) {
        return res.send(err)
    }
}



////////////////////////////////
export const addSeiveMaster = async (req: Request, res: Response) => {
    try {
        const data = req.body
        const key = Object.keys(data)
        const values = Object.values(data)
        const table = "seivemaster"
        const result = await executeInsertQuery(table, key, values, req, res)
        return res.status(201).json({ message: "data added ...", data: result })
    } catch (err) {
        res.status(400).json({ err });
    }
}

export const getSeiveMasterdetails = async (req: Request, res: Response) => {

    try {
        const find = req.body

        if (find && Object.keys(find).includes(find.stone_id)) {
            const data = await sql `select * from seivemaster where stone_id =${find.stone_id}`
            if (data.length > 0) {
                return res.status(200).json({ data: data })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        } else {
            const data = await sql `select * from seivemaster`
            if (data.length > 0) {
                return res.status(200).json({ data: data })
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
        const result = await executeInsertQuery(table, key, values, req, res)
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
   
    const find = req.body
    try {
        if (find && find.stn_serial) {
            const data = await sql `select * from stoneshapefile where stn_serial=${find.stn_serial}`
            if (data.length > 0) {
                return res.status(200).json({ data: data })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        } else {
            const data = await sql `select * from stoneshapefile`
            if (data.length > 0) {
                return res.status(200).json({ data: data })
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
        const result = await executeInsertQuery(table, key, values, req, res)
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
    const find = req.body
    try {
        if (find && find.stn_serial) {
            const data = await sql `select * from stonecolorfile where stn_serial =${find.stn_serial}`
            if (data.length > 0) {
                return res.status(200).json({ data: data })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        } else {
            const data = await sql `select * from stonecolorfile`
            if (data.length > 0) {
                return res.status(200).json({ data: data })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        }
    } catch (err) {
        return err
    }
}

export const addStoneQualityfile = async (req: Request, res: Response) => {
    const data = req.body
    try {
        const table = "stonequalityfile"
        const key = Object.keys(data)
        const values = Object.values(data)
        const result = await executeInsertQuery(table, key, values, req, res)
        if (result) {
            return res.status(200).json({ data: result })
        } else {
            return res.status(301).json({ message: "data not found" })
        }

    } catch (error) {
        return res.status(500).json({ message: error });
    }
}

export const getStoneQualityFile = async (req: Request, res: Response) => {
    const find = req.body
    try {
        if (find && find.stn_serial) {
            const data = await sql `select * from stonequalityfile where stn_serial =${find.stn_serial}`
            if (data.length > 0) {
                return res.status(200).json({ data: data })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        } else {
            const data = await sql `select * from stonequalityfile`
            if (data.length > 0) {
                return res.status(200).json({ data: data })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        }
    } catch (err) {
        return err
    }
}

export const addStoneMaster = async (req: Request, res: Response) => {
    const data = req.body
    try {
        const table = "stonemaster"
        const key = Object.keys(data)
        const values = Object.values(data)
        const result = await executeInsertQuery(table, key, values, req, res)
        if (result) {
            return res.status(200).json({ data: result })
        } else {
            return res.status(301).json({ message: "data not found" })
        }

    } catch (error) {
        return res.status(500).json({ message: error });
    }
}

export const getStoneMaster = async (req: Request, res: Response) => {
    const find = req.body
    try {
        if (find && find.stone_id) {
            const data = await sql `select * from stonemaster where stn_serial =${find.stone_id}`
            if (data.length > 0) {
                return res.status(200).json({ data: data })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        } else {
            const data = await sql `select * from stonemaster`
            if (data.length > 0) {
                return res.status(200).json({ data: data })
            } else {
                return res.status(301).json({ message: "data not found" })
            }
        }
    } catch (err) {
        return err
    }
}


/////////////////////////////////
export const deleteSeiveMaster = async (req: Request, res: Response) => {
    const id = req.body
    try {
        if (!id) {
            return res.status(401).json({ message: "Enter valid id" })
        }
        console.log(id)
        const find = await sql `DELETE FROM seivemaster WHERE stn_serial = ${id.id}`

        if (find.length > 0) {
            return res.status(200).json({ message: "Data deleted successfully" });
        } else {
            return res.status(301).json({ message: "Data with the provided id not found" });
        }
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: err })
    }

}

export const deleteStoneShape = async (req: Request, res: Response) => {
    const id = req.body
    try {
        if (!id) {
            return res.status(401).json({ message: "Enter valid id" })
        }
        const find = await sql `delete from  stoneshapefile where stn_serial = ${id.id}`

        if (find.length > 0) {
            return res.status(200).json({ message: "Data deleted successfully" });
        } else {
            return res.status(301).json({ message: "Data with the provided id not found" });
        }
    } catch (err) {
        return res.status(500).json({ message: err })
    }

}

export const deleteStoneColor = async (req: Request, res: Response) => {
    const id = req.body
    try {
        if (!id) {
            return res.status(401).json({ message: "Enter valid id" })
        }
        const find = await sql `delete from stonecolorfile where stn_serial = ${id.id}`

        if (find.length > 0) {
            return res.status(200).json({ message: "Data deleted successfully" });
        } else {
            return res.status(301).json({ message: "Data with the provided id not found" });
        }
    } catch (err) {
        return res.status(500).json({ message: err })
    }

}

export const deleteStoneQualityFile = async (req: Request, res: Response) => {
    const id = req.body
    try {
        if (!id) {
            return res.status(401).json({ message: "Enter valid id" })
        }
        const find = await sql `delete from stonequalityfile where stn_serial = ${id.id}`

        if (find.length > 0) {
            return res.status(200).json({ message: "Data deleted successfully" });
        } else {
            return res.status(301).json({ message: "Data with the provided id not found" });
        }
    } catch (err) {
        return res.status(500).json({ message: err })
    }

}

export const deleteStoneMaster = async (req: Request, res: Response) => {
    const id = req.body
    try {
        if (!id) {
            return res.status(401).json({ message: "Enter valid id" })
        }
        const find = await sql `delete from stonemaster where stone_id = ${id.id}`

        if (find.length > 0) {
            return res.status(200).json({ message: "Data deleted successfully" });
        } else {
            return res.status(301).json({ message: "Data with the provided id not found" });
        }
    } catch (err) {
        return res.status(500).json({ message: err })
    }

}


///////////////////////////

export const updateSeiveMaster = async (req: Request, res: Response) => {
    const data = req.body
    try {
        const excludedFields = ['stn_serial'];
        const filteredData = Object.keys(data)
            .filter((key: string) => !excludedFields.includes(key))
            .reduce((obj: any, key: string) => {
                obj[key] = data[key];
                return obj;
            }, {});
        // Extract field names and values from the filtered data object
        const fieldsToUpdate = Object.keys(filteredData);
        const values = Object.values(filteredData);
        const table = "seivemaster"
        const r = await executeUpdateQuery(table, fieldsToUpdate, values, "stn_serial", data.stn_serial);
        return res.status(200).json({ message: "data updated successfully", data: r })
    } catch (err) {
        return res.status(500).json({ message: err })
    }

}

export const updateStoneShape = async (req: Request, res: Response) => {
    const data = req.body
    try {
        const excludedFields = ['stn_serial'];
        const filteredData = Object.keys(data)
            .filter((key: string) => !excludedFields.includes(key))
            .reduce((obj: any, key: string) => {
                obj[key] = data[key];
                return obj;
            }, {});
        // Extract field names and values from the filtered data object
        const fieldsToUpdate = Object.keys(filteredData);
        const values = Object.values(filteredData);
        const table = "stoneshapefile"
        const r = await executeUpdateQuery(table, fieldsToUpdate, values, "stn_serial", data.stn_serial);
        return res.status(200).json({ message: "data updated successfully", data: r })
    } catch (err) {
        return res.status(500).json({ message: err })
    }
}

export const updateStoneColor = async (req: Request, res: Response) => {
    const data = req.body
    try {
        const excludedFields = ['stn_serial'];
        const filteredData = Object.keys(data)
            .filter((key: string) => !excludedFields.includes(key))
            .reduce((obj: any, key: string) => {
                obj[key] = data[key];
                return obj;
            }, {});
        // Extract field names and values from the filtered data object
        const fieldsToUpdate = Object.keys(filteredData);
        const values = Object.values(filteredData);
        const table = "stonecolorfile"
        const r = await executeUpdateQuery(table, fieldsToUpdate, values, "stn_serial", data.stn_serial);
        return res.status(200).json({ message: "data updated successfully", data: r })
    } catch (err) {
        return res.status(500).json({ message: err })
    }
}

export const updateStoneQualityFile = async (req: Request, res: Response) => {
    const data = req.body
    try {
        const excludedFields = ['stn_serial'];
        const filteredData = Object.keys(data)
            .filter((key: string) => !excludedFields.includes(key))
            .reduce((obj: any, key: string) => {
                obj[key] = data[key];
                return obj;
            }, {});
        // Extract field names and values from the filtered data object
        const fieldsToUpdate = Object.keys(filteredData);
        const values = Object.values(filteredData);
        const table = "stonequalityfile"
        const r = await executeUpdateQuery(table, fieldsToUpdate, values, "stn_serial", data.stn_serial);
        return res.status(200).json({ message: "data updated successfully", data: r })
    } catch (err) {
        return res.status(500).json({ message: err })
    }
}

export const updateStoneMaster = async (req: Request, res: Response) => {
    const data = req.body
    try {
        const excludedFields = ['stone_id'];
        const filteredData = Object.keys(data)
            .filter((key: string) => !excludedFields.includes(key))
            .reduce((obj: any, key: string) => {
                obj[key] = data[key];
                return obj;
            }, {});
        // Extract field names and values from the filtered data object
        const fieldsToUpdate = Object.keys(filteredData);
        const values = Object.values(filteredData);
        const table = "stonemaster"
        const r = await executeUpdateQuery(table, fieldsToUpdate, values, "stone_id", data.stone_id);
        return res.status(200).json({ message: "data updated successfully", data: r })
    } catch (err) {
        return res.status(500).json({ message: err })
    }
}