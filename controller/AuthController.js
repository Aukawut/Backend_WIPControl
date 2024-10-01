const Utils = require("../utils/Utils");
const jwt = require("jsonwebtoken");
const ldap = require("ldapjs");
require("dotenv").config();
const sql = require("mssql");
const { sqlConfig } = require("../config/config");

const InstanceUtils = new Utils();

class AuthController {
  async DomainLogin(req, res) {
    try {
      const { username, password } = req.body;
      const LdapUrl = process.env.LDAP_URL;
      const ldap_username = `${username}@PSTH.COM`;
      const domainName = process.env.DOMAIN_NAME;

      if (!username || !password) {
        return res.json({
          err: true,
          msg: "Please completed infomation!",
        });
      }

      const ldapClient = ldap.createClient({
        url: LdapUrl,
      });

      ldapClient.bind(ldap_username, password, async (bindErr) => {
        if (bindErr) {
          ldapClient.unbind();
          return res.json({
            err: true,
            msg: "Username or Password Invalid!",
          });
        } else {
          const UHR_Details = await InstanceUtils.getHRInfomation(username);

          if (UHR_Details && !UHR_Details.err) {
            const token = InstanceUtils.getToken(UHR_Details.payload); // สร้าง Token ;

            // LDAP search operation (Field ที่ต้องการ)
            const opts = {
              filter: `(&(samaccountname=${username}))`,
              scope: "sub",
              attributes: [
                "givenName",
                "sn",
                "cn",
                "department",
                "displayName",
                "sAMAccountName",
                "mail",
                "telephoneNumber",
                "initials",
              ],
            };

            ldapClient.search(
              `DC=${domainName?.split(".")[0]},DC=${domainName?.split(".")[1]}`, // ENV = PSTH.COM [0] = PSTH, [1] = COM
              opts,
              (err, results) => {
                if (err) {
                  ldapClient.unbind();
                  res.json({
                    err: true,
                    msg: "Error searching LDAP directory!",
                  });
                }

                results.on("searchEntry", (entry) => {
                  const searchAttributes = opts?.attributes; // Array ;
                  const resultLdap = entry.pojo;

                  if (resultLdap && resultLdap?.attributes.length > 0) {
                    // สิ่งที่ต้องการ กับข้อมูลที่มีบน Ldap เท่ากัน

                    if (
                      resultLdap?.attributes.length === searchAttributes.length
                    ) {
                      // สร้าง Array ใหม่

                      let newArrayKey = [];

                      // Loop Create New Key Of Array
                      for (let i = 0; i < resultLdap?.attributes.length; i++) {
                        const key = resultLdap?.attributes[i];
                        newArrayKey.push({
                          field: key.type,
                          value: key.values[0] !== "" ? key.values[0] : "",
                        });
                      }

                      return res.json({
                        err: false,
                        msg: "Success!",
                        results: newArrayKey,
                        status: "Ok",
                        token: token,
                        role: UHR_Details.payload.role,
                        empCode: UHR_Details.payload.emp_code,
                        factory: UHR_Details.payload.factory,
                        fullName: UHR_Details.payload.fullName,
                      });
                    } else {
                      let newArray = [];
                      let attr = resultLdap.attributes?.map(
                        (item) => item.type
                      );
                      let attrIsNull = searchAttributes.filter(
                        (x) => !attr.includes(x)
                      );

                      // Loop Create New Key Of Array
                      for (let i = 0; i < resultLdap?.attributes.length; i++) {
                        const key = resultLdap?.attributes[i];
                        newArray.push({
                          field: key.type,
                          value: key.values[0] !== "" ? key.values[0] : "",
                        });
                      }

                      newArray.push({ field: attrIsNull[0], value: "" }); // Push Key ใหม่ที่ไม่มีข้อมูลใน Ldap แต่มีการ Search โดย value = ""

                      ldapClient.unbind();

                      let resultObject = {};

                      // สร้าง Object ใหม่ {key:value}
                      for (let i = 0; i < newArray.length; i++) {
                        resultObject[newArray[i].field] = newArray[i].value;
                      }

                      return res.json({
                        err: false,
                        msg: "Success!",
                        results: resultObject,
                        status: "Ok",
                        token: token,
                        role: UHR_Details.payload.role,
                        empCode: UHR_Details.payload.emp_code,
                        factory: UHR_Details.payload.factory,
                        fullName: UHR_Details.payload.fullName,
                      });
                    }
                  } else {
                    ldapClient.unbind();

                    return res.json({
                      err: true,
                      msg: "Ldap information is not founded!",
                    });
                  }
                });
              }
            );
          } else {
            res.json({
              err: true,
              msg: "Permission is Denined!",
            });
          }
        }
      });
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async LoginByEmployeeCode(req, res) {
    try {
      const { empCode } = req.body;
      const pool = await new sql.ConnectionPool(sqlConfig).connect(); // Open Connection

      const users = await pool.request().input("code", sql.NVarChar, empCode)
        .query(`SELECT hr.*,u.ROLE,f.FACTORY_NAME,r.NAME_ROLE FROM [dbo].[V_AllUsers] hr
        LEFT JOIN [dbo].[TBL_USERS] u ON hr.UHR_EmpCode = u.EMP_CODE
        LEFT JOIN [dbo].[TBL_ROLE] r ON u.ROLE = r.Id
        LEFT JOIN [dbo].[TBL_FACTORY] f ON u.FACTORY = f.Id WHERE hr.UHR_EmpCode = @code`);

      if (users && users?.recordset?.length > 0) {
        // Check User in System;
        if (
          users.recordset[0].NAME_ROLE == "" ||
          users.recordset[0].NAME_ROLE == null
        ) {
          return res.json({
            err: true,
            msg: "Permission is denined!",
          });
        }

        const fName =
          users.recordset[0].UHR_FirstName_en.charAt(0) +
          users.recordset[0].UHR_FirstName_en.slice(1).toLowerCase();

        const lName =
          users.recordset[0].UHR_LastName_en.charAt(0) +
          users.recordset[0].UHR_LastName_en.slice(1).toLowerCase();

        const displayName = fName + " " + lName;

        const infoEmployee = {
          cn: displayName,
          sn: lName,
          telephoneNumber: users.recordset[0].AD_Phone,
          givenName: fName,
          displayName: displayName,
          department: users.recordset[0].UHR_Department,
          sAMAccountName: users.recordset[0].AD_UserLogon,
          mail: users.recordset[0].AD_Mail,
          initials: "",
        };

        const payloadJwt = {
          department: users.recordset[0].UHR_Department,
          emp_code: users.recordset[0].UHR_EmpCode,
          firstName: fName,
          lastName: lName,
          role: users.recordset[0].NAME_ROLE,
          factory: users.recordset[0].FACTORY_NAME,
          fullName: users.recordset[0].UHR_FullName_en,
        };  

      
        // Genarate Token
        const token = InstanceUtils.getToken(payloadJwt);

        // Json return to Client
        return res.json({
          err:false,
          msg:"Success!",
          results:infoEmployee,
          status:"Ok",
          token:token,
          role:users.recordset[0].NAME_ROLE,
          empCode:users.recordset[0].UHR_EmpCode,
          factory:users.recordset[0].FACTORY_NAME,
          fullName:users.recordset[0].UHR_FullName_en
        })

      } else {
        // ไม่พบข้อมูลพนักงาน
        return res.json({
          err: true,
          msg: "User isn't found!",
        });
      }
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async AuthApproveReqMetal(req, res) {
    try {
      const secret = process.env.TOKEN_APPROVE;
      const authHeader = req.headers.authorization;
      const { reqNo } = req.params;

      if (authHeader) {
        const token = authHeader.split(" ")[1];

        if (token) {
          jwt.verify(token, secret, (err, decoded) => {
            if (err) {
              return res.status(401).json({ err: true, msg: err.message });
            }

            if (decoded.requestNo !== reqNo) {
              return res.json({
                err: true,
                msg: "Token isn't correct!",
              });
            }

            return res.json({
              err: false,
              token: token,
              data: decoded,
              status: "Ok",
            });
          });
        } else {
          return res.json({
            err: true,
            msg: "Token is required!",
          });
        }
      }
    } catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }
}
module.exports = AuthController;
