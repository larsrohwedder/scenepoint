function(doc, req)
{
    if(doc.name == req.userCtx.name
    	&& doc.captcha === undefined) {
        return true;
    }

    return false;
}