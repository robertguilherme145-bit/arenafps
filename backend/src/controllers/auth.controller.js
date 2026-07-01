import {

 register,

 login

}

from "../services/auth.service.js";

export async function registerUser(

 req,

 res

){

 try{

  const resultado=

  await register(

   req.body

  );

  return res.json(

   resultado

  );

 }

 catch(err){

  return res.status(

   400

  ).json({

   erro:

   err.message

  });

 }

}

export async function loginUser(

 req,

 res

){

 try{

  const resultado=

  await login(

   req.body

  );

  return res.json(

   resultado

  );

 }

 catch(err){

  return res.status(

   400

  ).json({

   erro:

   err.message

  });

 }

}