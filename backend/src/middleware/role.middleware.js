export function role(...roles){

 return(req,res,next)=>{

  if(

   !roles.includes(

    req.user.role

   )

  ){

   return res.status(403).json({

    erro:"Sem permissão"

   });

  }

  next();

 };

}