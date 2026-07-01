import jwt from "jsonwebtoken";

export function auth(req,res,next){

 try{

  const bearer=req.headers.authorization;

  if(!bearer){

   return res.status(401).json({

    erro:"Token ausente"

   });

  }

  const token=

  bearer.replace(

   "Bearer ",

   ""

  );

  req.user=

  jwt.verify(

   token,

   process.env.JWT_SECRET

  );

  next();

 }

 catch{

  return res.status(401).json({

   erro:"Token inválido"

  });

 }

}