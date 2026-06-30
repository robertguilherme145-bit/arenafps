import {
 createUser,
 findUserByEmail
}
from "../models/user.model.js";

export const createUserService=(data)=>{

 if(
  findUserByEmail(
   data.email
  )
 ){

  throw new Error(
   "Email já cadastrado"
  );

 }

 return createUser(data);

};