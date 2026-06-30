const users=[];

export const createUser=(user)=>{

 users.push(user);

 return user;

};

export const findUserByEmail=(email)=>{

 return users.find(
  user=>user.email===email
 );

};