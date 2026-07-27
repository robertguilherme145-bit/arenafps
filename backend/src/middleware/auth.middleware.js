import jwt from "jsonwebtoken";
import { touchUserSession } from "../models/security.model.js";
import { resolveUserAccess } from "../services/identity.service.js";

export async function auth(req,res,next){

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

  const payload = jwt.verify(

   token,

   process.env.JWT_SECRET

  );

  if(payload.jti && !await touchUserSession(payload.jti)){
   return res.status(401).json({ erro:"Sessao encerrada" });
  }

  const access = await resolveUserAccess(payload.id, payload.role);

  if(!access){
   return res.status(401).json({ erro:"Conta nao encontrada" });
  }

  req.user={ ...payload, ...access, role:access.active_role };

  next();

 }

 catch{

  return res.status(401).json({

   erro:"Token inválido"

  });

 }

}
