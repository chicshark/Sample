define(function () {
  kony.print("User.js.require");
  var User = (function(oktaProfile){
    kony.print("User.js.constructor");
    var _oktaProfile = oktaProfile? oktaProfile : {};
    var _data = {};
    var _roles = [];

    function getData() {
      return _data;
    }

    function setDataFromOktaProfile(oktaProfile) {
      kony.print("User.js.setDataFromOktaProfile");
      kony.print("User.js.setDataFromOktaProfile "+JSON.stringify(oktaProfile));
      _oktaProfile = oktaProfile? oktaProfile : {};
      var userAttributes = _oktaProfile.user_attributes;
      if (userAttributes===undefined || userAttributes===null) {
        userAttributes = _oktaProfile.profile_attributes;
      }
      if (userAttributes!==undefined && userAttributes!==null) {
        setLoginName(userAttributes.preferred_username);
        setFirstName(userAttributes.given_name);
        setLastName(userAttributes.family_name);
        setFullName(userAttributes.name);
        setEmail(userAttributes.email);
        setBU(userAttributes.division);
        setGroups(userAttributes.groups);
        setId(userAttributes.sub);
      }
    }

    //INIT
    setDataFromOktaProfile(oktaProfile);

    function setRoles(roles) {
      kony.print("User.js.setRoles");
      _roles = roles? roles : [];
    }

    function hasRole(role) {
      return (_roles.indexOf(role)>-1)? true : false;
    }

    /**
  * Getters for accessing the _data.
  **/

    function getId(){
      return _data.id ? _data.id : "";
    }

    function getLoginName(){
      return _data.loginName ? _data.loginName : "";
    }

    //Not returned by the backend, only used for passing login/password from UI to connection handler
    function getPassword(){
      return _data.password ? _data.password : "";
    }

    function getFirstName(){
      return _data.firstName ? _data.firstName : "";
    }

    function getLastName(){
      return _data.lastName ? _data.lastName : "";
    }

    function getFullName(){
      return _data.fullName ? _data.fullName : "";
    }

    function getEmail(){
      return _data.email ? _data.email : "";
    }

    function getBU(){
      return _data.bu ? _data.bu : "";
    }

    function getGroups(){
      return _data.groups ? _data.groups : [];
    }

    function getScope() {
      var groups = getGroups();
      var bu = getBU();
      var scope = "";
      if (Array.isArray(groups)===false) {
        scope = groups+",";
      } else {
        for (var i=0; i<groups.length; i++) {
          scope += groups[i]+",";
        }
      }
      if (bu!=="") {
        scope += bu;
      } else {
        scope = scope.substr(0, scope.length-1);
      }
      return scope;
    }

    function setId(id){
      _data.id = id;
    }

    function setLoginName(loginName){
      _data.loginName = loginName;
    }

    function setPassword(password){
      _data.password = password;
    } 

    function setFirstName(firstName){
      _data.firstName = firstName;
    }

    function setLastName(lastName){
      _data.lastName = lastName;
    }

    function setFullName(fullName){
      _data.fullName = fullName;
    }

    function setEmail(email){
      _data.email = email;
    }

    function setBU(bu){
      _data.bu = bu;
    }

    //Identity services typically return a clean array
    //Integration services return a simple string (only the first element of a response array)
    //Using a post-processor we can produce a comma separated list
    //Our Refresh identity service produces such a list and this function takes care
    //of ensuring that getGroups will always return an array
    function setGroups(groups){
      if (groups!==undefined && groups!==null) {
        if (Array.isArray(groups)===true) {
          _data.groups = groups;
        } else {
          _data.groups = groups.split(',');
        }
      }
    }

    //Here we expose the public variables and functions
    return {
      typeOf: User.typeOf,
      getData: getData,
      setDataFromOktaProfile: setDataFromOktaProfile,
      setRoles : setRoles,
      hasRole : hasRole,
      getId : getId,
      getLoginName : getLoginName,
      getPassword : getPassword,
      getFirstName : getFirstName,
      getLastName : getLastName,
      getFullName : getFullName,
      getEmail : getEmail,
      getBU : getBU,
      getGroups : getGroups,
      getScope : getScope,
      setId : setId,
      setLoginName : setLoginName,
      setPassword: setPassword,
      setFirstName : setFirstName,
      setLastName : setLastName,
      setFullName : setFullName,
      setEmail : setEmail,
      setBU : setBU,
      setGroups : setGroups
    };
  });
  User.typeOf = "User";
  return User;
});