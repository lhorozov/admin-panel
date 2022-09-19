module.exports = (body, args) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Email</title>
    <style type="text/css">
      /*////// RESET STYLES //////*/
      body{height:100% !important; margin:0; padding:0; width:100% !important;}
      table{border-collapse:separate;}
      img, a img{border:0; outline:none; text-decoration:none;}
      h1, h2, h3, h4, h5, h6{margin:0; padding:0;}
      p{margin: 1em 0;}

      /*////// CLIENT-SPECIFIC STYLES //////*/
      .ReadMsgBody{width:100%;} .ExternalClass{width:100%;}
      .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div{line-height:100%;}
      table, td{mso-table-lspace:0pt; mso-table-rspace:0pt;}
      #outlook a{padding:0;}
      img{-ms-interpolation-mode: bicubic;}
      body, table, td, p, a, li, blockquote{-ms-text-size-adjust:100%; -webkit-text-size-adjust:100%;}
        
      /*////// GENERAL STYLES //////*/
      img{ max-width: 100%; height: auto; }

      /*////// TABLET STYLES //////*/
      @media only screen and (max-width: 620px) {
      .shrink_font{
        font-size: 62px;
      }
      /*////// GENERAL STYLES //////*/
        #foxeslab-email .table1 { width: 90% !important;}
        #foxeslab-email .table1-2 { width: 98% !important; margin-left: 1%; margin-right: 1%;}
        #foxeslab-email .table1-3 { width: 98% !important; margin-left: 1%; margin-right: 1%;}
        #foxeslab-email .table1-4 { width: 98% !important; margin-left: 1%; margin-right: 1%;}
        #foxeslab-email .table1-5 { width: 90% !important; margin-left: 5%; margin-right: 5%;}

        #foxeslab-email .tablet_no_float { clear: both; width: 100% !important; margin: 0 auto !important; text-align: center !important; }
        #foxeslab-email .tablet_wise_float { clear: both; float: none !important; width: auto !important; margin: 0 auto !important; text-align: center !important; }

        #foxeslab-email .tablet_hide { display: none !important; }

        #foxeslab-email .image1 { width: 98% !important; }
        #foxeslab-email .image1-290 { width: 100% !important; max-width: 290px !important; }

        .center_content{ text-align: center !important; }
        .center_image{ margin: 0 auto !important; }
        .center_button{ width: 50% !important;margin-left: 25% !important;max-width: 250px !important; }
        .centerize{margin: 0 auto !important;}
      }


      /*////// MOBILE STYLES //////*/
      @media only screen and (max-width: 480px){
        .shrink_font{
          font-size: 48px;
        }
        .safe_color{
          color: #6a1b9a !important;
        }
        /*////// CLIENT-SPECIFIC STYLES //////*/
        body{width:100% !important; min-width:100% !important;} /* Force iOS Mail to render the email at full width. */
        table[class="flexibleContainer"]{ width: 100% !important; }/* to prevent Yahoo Mail from rendering media query styles on desktop */

        /*////// GENERAL STYLES //////*/
        img[class="flexibleImage"]{height:auto !important; width:100% !important;}

        #foxeslab-email .table1 { width: 98% !important; }
        #foxeslab-email .no_float { clear: both; width: 100% !important; margin: 0 auto !important; text-align: center !important; }
        #foxeslab-email .wise_float {	clear: both;	float: none !important;	width: auto !important;	margin: 0 auto !important;	text-align: center !important;	}

        #foxeslab-email .mobile_hide { display: none !important; }
        .auto_height{height: auto !important;}
      }
    </style>
</head>
<body style="padding: 0;margin: 0;" id="foxeslab-email">
    <table class="table_full editable-bg-color bg_color_ffffff editable-bg-image" bgcolor="#ffffff" width="100%" align="center"  mc:repeatable="castellab" mc:variant="Header" cellspacing="0" cellpadding="0" border="0" style="background-image: url(#); background-repeat: no-repeat; background-position: center left; background-size: 100% 100%; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;" background="#">
        <tbody>
            <!-- padding-top -->
            <tr><td height=90"></td></tr>
            ${body}
        </tbody>
    </table>
</body>
</html>
`;
