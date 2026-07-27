export function role(...roles){

 return(req,res,next)=>{

  if(!roles.some((allowedRole) => req.user?.roles?.includes(allowedRole) || req.user?.role === allowedRole)){

   return res.status(403).json({

    erro:"Sem permissão"

   });

  }

  next();

 };

}
