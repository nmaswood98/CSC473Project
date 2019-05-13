import Phaser from 'phaser';
import { Bullet } from "./Projectiles";
import { emptyBar, HpBar, ManaBar } from "./StatusBar";
import * as firebase from 'firebase';

/**
 * Units Class. The class that defines and applies the properties of the towers that created.
 * Including tower attacking function.
 */
export class Units extends Phaser.Physics.Arcade.Sprite  {
    /**
     * 
     * Init the properties for units objects. Currently it is mainly about towers.
     * Create tower attacking function, add tower sprites and their hp bars to scene.
     * 
     * @param {Phaser.Scene} scene - The Scene that the unit is going to be in
     * @param {number} x - The X axis position of the unit in the scene
     * @param {number} y - The Y axis poistion of the unit in the scene
     * @param {number} barx - The X axis position of the unit's hp bar in the scene
     * @param {number} bary - The Y axis poistion of the unit's hp bar in the scene
     * @param {string} name - The name of the texture that is used for the unit
     * @param {string} type - The type of the unit
     * @param {number} healthPoints - The health that a unit will have in the game
     * @param {string} speed - The speed of the tower bullet
     * @param {number} range - The range that the unit can attack a target
     * @param {number} cooldown - The cooldown restriction that the unit can perform next attack
     * @param {string} uid - The unique id of the unit object.
     */
    
    constructor(scene,x,y,barx,bary,name,type=0,healthPoints=500,speed=1,range=180,cooldown=100,uid='233',selfID='233'){
        super(scene,x,y,name,type);
        if (this.type=1){
            this.tower=true;
        }
        scene.sys.updateList.add(this);
        scene.sys.displayList.add(this);
        //this.setScale(1);
        scene.physics.world.enable(this);
        this.setCollideWorldBounds(true);
        //this.setImmovable(true);
        this.barx=this.barx;
        this.bary=this.bary;
        this.scene = scene;
        this.healthPoints=healthPoints;
        this.speed=speed;
        this.range=range;
        this.cooldown=cooldown;
        this.selfID=selfID;
        this.createDefense(scene);
        this.gameroom = '';
        /**
         * True or false that says if the unit is being attacked
         * @name Units#beingAttacked
         * @type boolean
         */
        this.beingAttacked=false;
        /**
         * The counts that compares to time to check the unit can attack
         * @name Units#timeCycle
         * @type number
         */
        this.timeCycle=0;
        this.canAttack = 0;
        this.healthPoints=healthPoints;
        this.speed=speed;
        this.range=range;
        this.targetlist=[];
        this.target=scene.player;

        this.uid = uid;

        this.playersTower = false;
        this.setPlayersTower = ()=>{
            this.playersTower = true;
        };
       

        scene.updateSprite(this);
        scene.enemyTowers.add(this);

        this.scene = scene;
        
       /**
         * The hp bar of the unit
         * @name Units#building_bar
         * @type object
         */
        this.building_bar = new HpBar(scene,barx ,bary,'hp',this.healthPoints);
    }
    /**
      * Function to assign new target to the unit object
      * This Function updates the newtarget object to be the new target.
      * @param {object} newtarget - The new target that the unit is assigned to
      */   
    changetarget(newtarget){
        this.target=newtarget;
    }
   /**
      * Function to assign uid to the unit.
      * Mainly used in the multi player scene to assign player uid to the tower
      * @param {number} uid - The uid that the unit is assigned to 
      */   
    assignID(uid){
        this.uid = uid;
    }

    /**
     * collision function that is called when a collision occurs to the unit. 
     * calls the takeDamage function and change being attacked status to true.
     */
    collision(attackeruid){
        this.building_bar.cutHPBar(5);
        this.takeDamage(5,attackeruid);
        this.beingAttacked=true;
    }
    /**
     * changes tint and canbeAttacked based on the time passed into the funciton
     * if beingAttacked is true it tints the unit red and sets the count ot the current time
     * 
     * @param {number} time - The time that is used to determine how long the unit should be tinted
     */
    isInjured(time){
        if(this.beingAttacked===true){
            this.tint=0xff0000;
            this.count=time;
        }
        else{
            if(time>this.count+1000)
            {this.tint=0xffffff;}

        }
    }

    /**
     * Function to remove the unit so we can handle other things related to the death such as stop the attack.  
     * Also, for the towers, if the player's tower is killed, he/she lost the game, if only one tower remains,
     * the player who owns the tower wins the game.
     */
    kill(firstDeath=true, attackeruid){
        if(this.gameroom !== '' && firstDeath){
            firebase.database().ref(`Games/${this.gameroom}/Towers/${this.selfID}`).transaction( snapShot =>{
                firebase.database().ref(`Games/${this.gameroom}/Towers/${this.selfID}`).update({
                    alive: false,
                    killerid: attackeruid
                })
            })
      
        };
        this.destroy();     
        
    } 
    /**
     * Function to damage the unit by the the given number supplied to the funciton
     * If the ending healthpoints is less than 0 it calls the kill function
     * 
     * @param {number} damage - the amount of damage the unit should take
     */
    takeDamage(damage,attackeruid){
        this.healthPoints = this.healthPoints - damage;
       
        if( this.healthPoints <= 0 ){
            this.kill(true,attackeruid);

        }
    }
    
    /**
     * Intializes the weapon of the unit so that the unit can shoot and defend itself if it is a tower.
     * It creates the bullets which is added to the scene.
     * Including the defend function and removeDefense funciton for the unit.
     * @param {Phaser.Scene} scene - The scene that the unit is inside that is used to create the bullet group
     */
    createDefense(scene){
        this.bullets = scene.physics.add.group({classType: Bullet, runChildUpdate: true});
        /**
         * (Function is created by the createDefense function)
         * 
         * calling defend will shoot a bullet in the direction that the unit is facing. 
         */
        this.defend = (target)=>{
            //console.log("this");
            let bullet = this.bullets.get();
            scene.towerShooting.add(bullet);
            bullet.shoot(this.uid,this,target,true);
            bullet.setTexture('shoot3').setScale(0.2).setSize(32,30);
        };

        /**
         * calling removeDefense destroys the weapon used by the unit sets attack back to null
         */
        this.removeDefense = ()=>{ //destroys the weapon used
            this.bullets.destroy();
            this.defend = null;
        };    

    }
    /**
     * Function that uses Phaser.Math.Distance.Between built-in function to find 
     * the distance between tower and target.This function return the distance 
     * between these two objects so we can future compare to find the target with 
     * the shortest distance
     * @param {object} tower - The tower object that we want to compare to
     * @param {object} target - The target object that we want to find the distance with unit
     */ 
    distance(tower,target){
        let distance=Phaser.Math.Distance.Between(tower.x, tower.y, target.x, target.y);
        return distance;
    }

    /**
     * Function to let the tower shoot correct target if the target is in its attack range.
     * The attack of the tower will have a cooldown that is assigned to it.
     * When the attack range,cooldown are fine, the tower is ready to attack the target.
     * The target is the one that is nearest to the tower which is found from the findnearenemy
     * function inside towerAttack.
     * @param {object} tower - The tower that we will perform the attack function.
     * @param {object} target - The target that the tower will attack.
     * @param {number} time - The time passes to keep track of whether the cooldown is fine.
     */
    towerAttack(tower,target,time){

        let distance = Math.sqrt(Math.pow(target.x - tower.x, 2) + Math.pow(target.y - tower.y, 2));
        let vX = (target.x - tower.x)/distance;
        let vY = (target.y - tower.y)/distance;
        let shortestDistance=1000000000;
        this.scene.enemies.getChildren().map(child => this.targetlist.push(child));  
        this.targetlist.push(this.scene.player);
        /**      
         * (Function is created by the TowerAttack function) 
         * 
         * Findneartower finds the nearest enemy or player to attack from the targetlist that we 
         * generated. The function will call distance function to find the target that is nearest 
         * to the tower, and assign it to be new target, which will be future attacked if it is 
         * within the attack range of the tower.
         */ 

        this.findnearenemy = () =>{
            for (let i = 0; i < this.targetlist.length; i++) {
                if(this.targetlist[i].active){
                let enemydistance=this.distance(tower,this.targetlist[i]);
                if (enemydistance<shortestDistance){
                    shortestDistance=enemydistance;      
                    this.changetarget(this.targetlist[i]);}
                }
            } };  

        if( this.scene.otherPlayers !== undefined && Object.keys(this.scene.otherPlayers).length > 0){
            this.enemyplayers = this.scene.otherPlayers;
            this.enemyplayers.self = this.scene.player1;
            this.enemyplayerid = Object.keys(this.scene.otherPlayers);
    
            for( let i = 0; i < this.enemyplayerid.length; i++ ){
                let player = this.enemyplayers[this.enemyplayerid[i]];
                this.targetlist.push(player)
                }
            this.findnearenemy();
        }
        if(this.targetlist.length>0){
            this.findnearenemy();
            if (Math.abs(target.x - tower.x) < this.range && Math.abs(target.y - tower.y) < this.range){ 
                if(target.active && target.uid!=tower.uid){
                    if(this.timeCycle < time){
                        this.defend({x: vX - tower.body.velocity.x ,y: vY - tower.body.velocity.y});
                        this.timeCycle = time + tower.cooldown ;
                    }
                }
            }               
        }    
    }
        

   /**
    * The update method that gets called by the playscene 60 times a second.
    * Handles isInjured and towerAttack.
    * 
    * @param {number} time - Time that gets passed by Phaser when update is called
    */
    update(time){
        this.isInjured(time);
        this.beingAttacked=false;
        this.towerAttack(this,this.target,time);
       // console.log(this.len)
           
        
    }
}