function(doc, req)
{
    if(doc.captcha &&
    	doc.roles.indexOf("validated") == -1) {
        return true;
    }

    return false;
}