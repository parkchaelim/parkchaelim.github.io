window.addEventListener('DOMContentLoaded', function () {
    const noScroll = setTimeout(()=>{

        $('#no_scroll').hide();

    },2000)


    setTimeout(() => {
        $('#section01').addClass('on');
    }, 100)



    /* scroll event section */
    container.addListener((e) => {

        let scrollTop = container.scrollTop;
        $('.posNum').html(scrollTop)

        console.log(scrollTop);


        if(scrollTop >= 1000 ) {
            $('#section01 .s1_title').addClass('on');
        }else {
            $('#section01 .s1_title').removeClass('on');
        }

        if(scrollTop >= 3860 && scrollTop <= 14000) {
            $('#section02 .s2_title').addClass('on');
        }else {
            $('#section02 .s2_title').removeClass('on');
        }

        if(scrollTop >= 13700 && scrollTop <= 17500) {
            $('#section03 .s3_title').addClass('on');
            $('#section03 .s3_sub').addClass('on');
        }else {
            $('#section03 .s3_title').removeClass('on');
            $('#section03 .s3_sub').removeClass('on');
            
        }


        if(scrollTop >= 19970 && scrollTop <= 25217) {
            $('#section05 .s5_title').addClass('on');

        }else {
            $('#section05 .s5_title').removeClass('on');

            
        }


        if(scrollTop >= 20000 && scrollTop <= 25217) {
            $('#section05 .s5_title2').addClass('on');

        }else {
            $('#section05 .s5_title2').removeClass('on');

            
        }

        if(scrollTop >= 20200 && scrollTop <= 25217) {
            $('#section05 .s5_main').addClass('on');
            $('#section05 .s5_home').addClass('on');

        }else {
            $('#section05 .s5_main').removeClass('on');
            $('#section05 .s5_home').removeClass('on');

            
        }

        if(scrollTop >= 21000 && scrollTop <= 22000) {
            $('#section05 .txt_1').addClass('on');


        }else {
            $('#section05 .txt_1').removeClass('on');
  
        }


        if(scrollTop >= 21700 && scrollTop <= 22500) {
            $('#section05 .txt_2').addClass('on');


        }else {
            $('#section05 .txt_2').removeClass('on');
  
        }

        if(scrollTop >= 22300 && scrollTop <= 23100) {
            $('#section05 .txt_3').addClass('on');


        }else {
            $('#section05 .txt_3').removeClass('on');
  
        }

        if(scrollTop >= 23000 && scrollTop <= 25000) {
            $('#section05 .txt_4').addClass('on');


        }else {
            $('#section05 .txt_4').removeClass('on');
  
        }


        if(scrollTop >= 23100 && scrollTop <= 25000) {
            $('#section05 .window').addClass('on');
            $('#section05 .gif').addClass('on');



        }else {
            $('#section05 .gif').removeClass('on');
            $('#section05 .window').removeClass('on');

  
        }



        if(scrollTop >= 28100 && scrollTop <= 30003) {
            $('#section11 .sub_window').addClass('on');
            $('#section11 .txt_window').addClass('on');

        }else {
            $('#section11 .sub_window').removeClass('on');
            $('#section11 .txt_window').removeClass('on');

        }




        if(scrollTop >= 28500 && scrollTop <= 30003) {
            $('#section11 .menu').addClass('on');
            $('#section11 .txt_menu').addClass('on');
            

        }else {
            $('#section11 .menu').removeClass('on');
            $('#section11 .txt_menu').removeClass('on');

        }



        if(scrollTop >= 29700 && scrollTop <= 32900) {
            $('#section12 .page2').addClass('on');
            $('#section12 .page2_txt').addClass('on');
            

        }else {
            $('#section12 .page2').removeClass('on');
            $('#section12 .page2_txt').removeClass('on');

        }

        if(scrollTop >= 30600 && scrollTop <= 32900) {
            $('#section12 .page2').addClass('on2');
            
        }else {

            $('#section12 .page2').removeClass('on2');
        }


        if(scrollTop >= 30650 && scrollTop <= 33800) {
            $('#section12 .mockup').addClass('on');

            


        }else {
            $('#section12 .mockup').removeClass('on');

        }


        if(scrollTop >= 31450 && scrollTop <= 40000) {
            $('#section12 .page3').addClass('on');

            


        }else {
            $('#section12 .page3').removeClass('on');

        }

        if(scrollTop >= 31550 && scrollTop <= 33800) {
            $('#section12 .page3_txt1').addClass('on');


        }else {
            $('#section12 .page3_txt1').removeClass('on');

        }

        if(scrollTop >= 32300 && scrollTop <= 33800) {
            $('#section12 .page3_txt2').addClass('on');


        }else {
            $('#section12 .page3_txt2').removeClass('on');

        }


        if(scrollTop >= 32750 && scrollTop <= 40000) {
            $('#section12 .page3_txt3').addClass('on');
            $('#section12 .float').addClass('on');


        }else {
            $('#section12 .page3_txt3').removeClass('on');
            $('#section12 .float').removeClass('on');

        }


        if(scrollTop >= 33750 && scrollTop <= 36000) {
            $('#section13 .bg_txt').addClass('on');
            $('#section13 .bg_img').addClass('on');
            $('#section13 .s13_window').addClass('on');
 


        }else {
            $('#section13 .bg_txt').removeClass('on');
            $('#section13 .bg_img').removeClass('on');
            $('#section13 .s13_window').removeClass('on');


        }

        if(scrollTop >= 33800 && scrollTop <= 40000) {
            $('#section13 .s13_txt').addClass('on');



        }else {
            $('#section13 .s13_txt').removeClass('on');


        }

        if(scrollTop >= 34400 && scrollTop <= 40000) {
            $('#section13 .s13_mockup').addClass('on');



        }else {
            $('#section13 .s13_mockup').removeClass('on');


        }


        if(scrollTop >= 35000 && scrollTop <= 50000) {
            $('#section14 .page5').addClass('on');
            $('#section14 .txt_1').addClass('on');



        }else {
            $('#section14 .page5').removeClass('on');
            $('#section14 .txt_1').removeClass('on');
            


        }


        if(scrollTop >= 35900 && scrollTop <= 50000) {
            $('#section14 .page6').addClass('on');
            $('#section14 .txt_2').addClass('on');



        }else {
            $('#section14 .page6').removeClass('on');
            $('#section14 .txt_2').removeClass('on');

        }


        if(scrollTop >= 36700 && scrollTop <= 40000) {
            $('#section14 .end').addClass('on');
            $('#section14 .end_txt').addClass('on');



        }else {
            $('#section14 .end').removeClass('on');
            $('#section14 .end_txt').removeClass('on');
            


        }





    });


    /*  slide,click event section */



    let value = 0;
    $('#section07 .persona .persona_btn').click(function () {

        container.scrollTo (0,27620, 600, {
            callback: () => console.log('done!'),
            easing: easing.easeInOutCirc,
        });

    });


    gsap.to('#section01 .fix-this-01', {
        scrollTrigger: {
            trigger: "#section01 .trigger-this-01",
            start: "top top",
            // end: () => "+=" + 300,
            end: 'bottom bottom',
            pin:true,
            scrub: true,
        }
    });


    gsap.to('#section01 .main', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section01",
            start: "5 top",
            end: () => "+=" + 500,
            scrub: true,

        }
    });


    gsap.to('#section01 .s1_title', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section01",
            start: "500 top",
            end: () => "+=" + 500,
            scrub: true,
        }
        
    });

    gsap.to('#section01 .s2', {
        scale: 1.02,
        opacity:1,
        scrollTrigger: {
            trigger: "#section01",
            start: "1000 top",
            end: () => "+=" + 500,
            scrub: true,
        }
        
    });

    gsap.to('#section01 .s2_title1', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section01",
            start: "1500 top",
            end: () => "+=" + 300,
            scrub: true,
        }
        
    });

    gsap.to('#section01 .main_black', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section01",
            start: "1500 top",
            end: () => "+=" + 300,
            scrub: true,
        }
        
    });


    gsap.to('#section01 .sub_2', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section01",
            start: "1500 top",
            end: () => "+=" + 300,
            scrub: true,
        }
        
    });


    gsap.to('#section01 .s2_title2', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section01",
            start: "1700 top",
            end: () => "+=" + 300,
            scrub: true,
        }
        
    });


    gsap.to('#section01 .s2_title3', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section01",
            start: "2000 top",
            end: () => "+=" + 300,
            scrub: true,
        }
        
    });



    gsap.to('#section02 .fix-this-02', {
        scrollTrigger: {
            trigger: "#section02 .trigger-this-02",
            start: "top top",
            // end: () => "+=" + 300,
            end: 'bottom bottom',
            pin: true,
            // pinSpace:false,
            pinSpacing: false,
            scrub: true,
        }
    });

    gsap.to('#section02 .fix-this-02 .inner', {
        // x:-4735,
        x:-1006,
        scrollTrigger: {
            trigger: "#section02",
            start: "1000 top",
            end:'bottom bottom',
            scrub: true,
        }

    });




    gsap.to('#section02 .b_img1', { //움직일 받을 대상
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section02",
            start: "0 top", //시작지점
            end: () => "+=" + 20,
            scrub: true,
        }
    });


    gsap.to('#section02 .b_img2', { //움직일 받을 대상
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section02",
            start: "50 top", //시작지점
            end: () => "+=" + 20,
            scrub: true,
        }
    });

    gsap.to('#section02 .b_img3', { //움직일 받을 대상
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section02",
            start: "100 top", //시작지점
            end: () => "+=" + 20,
            scrub: true,
        }
    });

    gsap.to('#section02 .b_img4', { //움직일 받을 대상
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section02",
            start: "1500 top", //시작지점
            end: () => "+=" + 20,
            scrub: true,
        }
    });


    gsap.to('#section02 .b_img5', { //움직일 받을 대상
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section02",
            start: "3000 top", //시작지점
            end: () => "+=" + 20,
            scrub: true,
        }
    });













    gsap.to('#section03 .fix-this-03', {
        scrollTrigger: {
            trigger: "#section03 .trigger-this-03",
            start: "top top",
            // end: () => "+=" + 300,
            end: 'bottom bottom',
            pin:true,
            scrub: true,
        }
    });



    gsap.to('#section03 .s3_title2', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section03",
            start: "top top",
            end: () => "+=" + 500,
            scrub: true,
        }
        
    });

    gsap.to('#section03 .circle1', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section03",
            start: "500 top",
            end: () => "+=" + 500,
            scrub: true,
        }
        
    });


    gsap.to('#section03 .circle2', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section03",
            start: "500 top",
            end: () => "+=" + 500,
            scrub: true,
        }
        
    });


    gsap.to('#section03 .line', {
        x:0,
        y:0,
        scale:1,
        opacity:1,
        scrollTrigger: {
            trigger: "#section03",
            start: "800 top",
            end: () => "+=" + 200,
            scrub: true,
        }
        
    });

    gsap.to('#section03 .to_be', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section03",
            start: "800 top",
            end: () => "+=" + 200,
            scrub: true,
        }
        
    });


    gsap.to('#section03 .circle4', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section03",
            start: "1000 top",
            end: () => "+=" + 500,
            scrub: true,
        }
        
    });






















    gsap.to('#section04 .fix-this-04', {
        scrollTrigger: {
            trigger: "#section04 .trigger-this-04",
            start: "top top",
            // end: () => "+=" + 300,
            end: 'bottom bottom',
            pin:true,
            scrub: true,
        }
    });

    gsap.to('#section04 .cus', {
        x:0,
        y:0,
        scrollTrigger: {
            trigger: "#section04",
            start: "10 top",
            end: () => "+=" + 500,
            scrub: true,
        }
    });

    gsap.to('#section04 .tom', {
        x:0,
        y:0,
        scrollTrigger: {
            trigger: "#section04",
            start: "10 top",
            end: () => "+=" + 500,
            scrub: true,
        }
    });

    gsap.to('#section04 .mellow', {
        x:0,
        y:0,
        scrollTrigger: {
            trigger: "#section04",
            start: "10 top",
            end: () => "+=" + 500,
            scrub: true,
        }
    });


    gsap.to('#section04 .mellow1', {
        x:-2000,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section04",
            start: "10 top",
            end: () => "+=" + 500,
            scrub: true,
        }
    });


    gsap.to('#section04 .s4_title', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section04",
            start: "600 top",
            end: () => "+=" + 200,
            scrub: true,
        }
    });

    gsap.to('#section04 .s4_title2', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section04",
            start: "800 top",
            end: () => "+=" + 300,
            scrub: true,
        }
    });

    gsap.to('#section04 .s4_title3', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section04",
            start: "1200 top",
            end: () => "+=" + 300,
            scrub: true,
        }
    });

    gsap.to('#section04 .typo', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section04",
            start: "1300 top",
            end: () => "+=" + 200,
            scrub: true,
        }
    });




    gsap.to('#section04 .s4_title4', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section04",
            start: "1700 top",
            end: () => "+=" + 300,
            scrub: true,
        }
    });


    gsap.to('#section04 .color_1', {
        x:0,
        y:0,
        opacity:1,
        scale:1,
        scrollTrigger: {
            trigger: "#section04",
            start: "1800 top",
            end: () => "+=" + 100,
            scrub: true,
        }
    });


    gsap.to('#section04 .color_2', {
        x:0,
        y:0,
        opacity:1,
        scale:1,
        scrollTrigger: {
            trigger: "#section04",
            start: "1900 top",
            end: () => "+=" + 100,
            scrub: true,
        }
    });


    gsap.to('#section04 .color_3', {
        x:0,
        y:0,
        opacity:1,
        scale:1,
        scrollTrigger: {
            trigger: "#section04",
            start: "2000 top",
            end: () => "+=" + 100,
            scrub: true,
        }
    });


    









    gsap.to('#section06 .fix-this-06', {
        scrollTrigger: {
            trigger: "#section06 .trigger-this-06",
            start: "top top",
            // end: () => "+=" + 300,
            end: 'bottom bottom',
            pin:true,
            scrub: true,
        }
    });


    gsap.to('#section06 .txt_5', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section06",
            start: "1 top",
            end: () => "+=" + 300,
            scrub: true,
        }
    });

    gsap.to('#section06 .arrow', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section06",
            start: "300 top",
            end: () => "+=" + 10,
            scrub: true,
        }
    });



    gsap.to('#section06 .txt_6', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section06",
            start: "305 top",
            end: () => "+=" + 300,
            scrub: true,
        }
    });


    gsap.to('#section06 .img', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section06",
            start: "500 top",
            end: () => "+=" + 300,
            scrub: true,
        }
    });


    gsap.to('#section06 .txt_7', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section06",
            start: "510 top",
            end: () => "+=" + 300,
            scrub: true,
        }
    });

    gsap.to('#section06 .txt_ro', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section06",
            start: "500 top",
            end: () => "+=" + 300,
            scrub: true,
        }
    });


    gsap.to('#section06 .b_arrow', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section06",
            start: "500 top",
            end: () => "+=" + 300,
            scrub: true,
        }
    });

    gsap.to('#section06 .txt_ro2', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section06",
            start: "500 top",
            end: () => "+=" + 300,
            scrub: true,
        }
    });


    gsap.to('#section06 .eclipse', {
        // clipPath:'circle(100% at 50% 50%)',
        scale:3,
        rotate:360,
        scrollTrigger: {
            trigger: "#section06",
            start: "1200 top",
            end: () => "+=" + 1500,
            scrub: true,
        }

    });


    gsap.to('#section06 .sub_title', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section06",
            start: "2000top",
            end: () => "+=" + 600,
            scrub: true,
        }
    });



    gsap.to('#section06 .sub_img1', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section06",
            start: "2400top",
            end: () => "+=" + 500,
            scrub: true,
        }
    });

    gsap.to('#section06 .sub_img2', {
        x:0,
        y:0,
        opacity:1,
        scrollTrigger: {
            trigger: "#section06",
            start: "2400top",
            end: () => "+=" + 500,
            scrub: true,
        }
    });







    
   




    gsap.to('#section11 .bg_01', {
        y: 0,
        scrollTrigger: {
            trigger: "#section11",
            start: "top 200",
            end: () => "+=" + 200,
            scrub: true,
        }
    });


    gsap.to('#section11', {
        scrollTrigger: {
            trigger: "#section11",
            start: "-100 top",
            scrub: true,
            toggleClass:'on1',
        }

    });

    gsap.to('#section11', {
        scrollTrigger: {
            trigger: "#section11",
            start: "100 top",
            scrub: true,
            toggleClass:'on2',
        }

    });

    gsap.to('#section12', {
        scrollTrigger: {
            trigger: "#section12",
            start: "-900 top",
            scrub: true,
            toggleClass:'on1',
        }

    });

    gsap.to('#section12', {
        scrollTrigger: {
            trigger: "#section12",
            start: "-200 top",
            scrub: true,
            toggleClass:'on2',
        }

    });

    gsap.to('#section12', {
        scrollTrigger: {
            trigger: "#section12",
            start: "300 top",
            scrub: true,
            toggleClass:'on3',
        }

    });

    gsap.to('#section12', {
        scrollTrigger: {
            trigger: "#section12",
            start: "bottom 1550",
            scrub: true,
            toggleClass:'on4',
        }

    });

    gsap.to('#section13', {
        scrollTrigger: {
            trigger: "#section13",
            start: "-600 top",
            scrub: true,
            toggleClass:'on1',
        }

    });

    gsap.to('#section13 .gui_02_confetti', {
        y: 200,
        easein: true,
        scrollTrigger: {
            trigger: "#section13",
            start: "top top",
            end: () => "+=" + 800,
            scrub: true,
        }
    });

    gsap.to('#section13 .gui_02_confetti > img', {
        y: -200,
        scrollTrigger: {
            trigger: "#section13",
            start: "800 top",
            end: () => "+=" + 800,
            scrub: true,
        }
    });

    gsap.to('#section13', {
        scrollTrigger: {
            trigger: "#section13",
            start: "230 top",
            scrub: true,
            toggleClass:'on2',
        }

    });

    gsap.to('#section13', {
        scrollTrigger: {
            trigger: "#section13",
            start: "270 top",
            scrub: true,
            toggleClass:'on3',
        }

    });

    gsap.to('#section13', {
        scrollTrigger: {
            trigger: "#section13",
            start: "1380 top",
            scrub: true,
            toggleClass:'on4',
        }

    });

    gsap.to('#section13', {
        scrollTrigger: {
            trigger: "#section13",
            start: "2580 top",
            scrub: true,
            toggleClass:'on5',
        }

    });

    gsap.to('#section13', {
        scrollTrigger: {
            trigger: "#section13",
            start: "3400 top",
            scrub: true,
            toggleClass:'on6',
        }

    });

    gsap.to('#section13', {
        scrollTrigger: {
            trigger: "#section13",
            start: "4200 top",
            scrub: true,
            toggleClass:'on7',
        }

    });

    gsap.to('#section14', {
        scrollTrigger: {
            trigger: "#section14",
            start: "-80 top",
            scrub: true,
            toggleClass:'on1',
        }

    });

    gsap.to('#section14', {
        scrollTrigger: {
            trigger: "#section14",
            start: "400 top",
            scrub: true,
            toggleClass:'on2',
        }

    });

    gsap.to('#section15', {
        scrollTrigger: {
            trigger: "#section15",
            start: "-600 top",
            scrub: true,
            toggleClass:'on1',
        }

    });

    gsap.to('#section15', {
        scrollTrigger: {
            trigger: "#section15",
            start: "-190 top",
            scrub: true,
            toggleClass:'on2',
        }

    });

    gsap.to('#section15', {
        scrollTrigger: {
            trigger: "#section15",
            start: "670 top",
            scrub: true,
            toggleClass:'on3',
        }

    });

    gsap.to('#section15', {
        scrollTrigger: {
            trigger: "#section15",
            start: "top top",
            scrub: true,
            toggleClass:'on4',
        }

    });

    gsap.to('#section15', {
        scrollTrigger: {
            trigger: "#section15",
            start: "450 top",
            scrub: true,
            toggleClass:'on5',
        }

    });

    gsap.to('#section15', {
        scrollTrigger: {
            trigger: "#section15",
            start: "1100 top",
            scrub: true,
            toggleClass:'on6',
        }

    });

    gsap.to('#section16', {
        scrollTrigger: {
            trigger: "#section16",
            start: "-450 top",
            scrub: true,
            toggleClass:'on1',
        }

    });

    gsap.to('#section16', {
        scrollTrigger: {
            trigger: "#section16",
            start: "-100 top",
            scrub: true,
            toggleClass:'on2',
        }

    });

    gsap.to('#section16', {
        scrollTrigger: {
            trigger: "#section16",
            start: "1100 top",
            scrub: true,
            toggleClass:'on3',
        }

    });

    gsap.to('#section16', {
        scrollTrigger: {
            trigger: "#section16",
            start: "1550 top",
            scrub: true,
            toggleClass:'on4',
        }

    });

    gsap.to('#section16', {
        scrollTrigger: {
            trigger: "#section16",
            start: "1800 top",
            scrub: true,
            toggleClass:'on5',
        }

    });

    gsap.to('#section16', {
        scrollTrigger: {
            trigger: "#section16",
            start: "1770 top",
            scrub: true,
            toggleClass:'on6',
        }

    });

    gsap.to('#section16', {
        scrollTrigger: {
            trigger: "#section16",
            start: "700 top",
            scrub: true,
            toggleClass:'on7',
        }

    });

    gsap.to('#section17 .bg_07', {
        y: 0,
        scrollTrigger: {
            trigger: "#section17",
            start: "top 800",
            end: () => "+=" + 300,
            scrub: true,
        }

    });

    gsap.to('#section17', {
        scrollTrigger: {
            trigger: "#section17",
            start: "-600 top",
            scrub: true,
            toggleClass:'on1',
        }

    });

    gsap.to('#section17', {
        scrollTrigger: {
            trigger: "#section17",
            start: "-100 top",
            scrub: true,
            toggleClass:'on2',
        }

    });

    gsap.to('#section17', {
        scrollTrigger: {
            trigger: "#section17",
            start: "360 top",
            scrub: true,
            toggleClass:'on3',
        }

    });

    gsap.to('#section17', {
        scrollTrigger: {
            trigger: "#section17",
            start: "400 top",
            scrub: true,
            toggleClass:'on4',
        }

    });

    gsap.to('#section17', {
        scrollTrigger: {
            trigger: "#section17",
            start: "1000 top",
            scrub: true,
            toggleClass:'on5',
        }

    });

    gsap.to('#section17', {
        scrollTrigger: {
            trigger: "#section17",
            start: "1850 top",
            scrub: true,
            toggleClass:'on6',
        }

    });

    gsap.to('#section18 .bg_08', {
        rotate: 0,
        scrollTrigger: {
            trigger: "#section18",
            start: "top 700",
            end: () => "+=" + 400,
            scrub: true,
        }

    });

    gsap.to('#section18', {
        scrollTrigger: {
            trigger: "#section18",
            start: "-670 top",
            scrub: true,
            toggleClass:'on1',
        }

    });

    gsap.to('#section18', {
        scrollTrigger: {
            trigger: "#section18",
            start: "-100 top",
            scrub: true,
            toggleClass:'on2',
        }

    });

    gsap.to('#section20 .bg_10', {
        y: 0,
        scrollTrigger: {
            trigger: "#section20",
            start: "top 800",
            end: () => "+=" + 300,
            scrub: true,
        }

    });

    gsap.to('#section19', {
        scrollTrigger: {
            trigger: "#section19",
            start: "-700 top",
            scrub: true,
            toggleClass:'on1',
        }

    });

    gsap.to('#section19', {
        scrollTrigger: {
            trigger: "#section19",
            start: "-500 top",
            scrub: true,
            toggleClass:'on2',
        }

    });

    gsap.to('#section19', {
        scrollTrigger: {
            trigger: "#section19",
            start: "-150 top",
            scrub: true,
            toggleClass:'on3',
        }

    });

    gsap.to('#section19', {
        scrollTrigger: {
            trigger: "#section19",
            start: "50 top",
            scrub: true,
            toggleClass:'on4',
        }

    });

    gsap.to('#section19', {
        scrollTrigger: {
            trigger: "#section19",
            start: "460 top",
            scrub: true,
            toggleClass:'on5',
        }

    });

    gsap.to('#section20', {
        scrollTrigger: {
            trigger: "#section20",
            start: "-600 top",
            scrub: true,
            toggleClass:'on1',
        }

    });

    gsap.to('#section20', {
        scrollTrigger: {
            trigger: "#section20",
            start: "-200 top",
            scrub: true,
            toggleClass:'on2',
        }

    });

    gsap.to('#section20', {
        scrollTrigger: {
            trigger: "#section20",
            start: "850 top",
            scrub: true,
            toggleClass:'on3',
        }

    });

    gsap.to('#section20', {
        scrollTrigger: {
            trigger: "#section20",
            start: "1400 top",
            scrub: true,
            toggleClass:'on4',
        }

    });

    gsap.to('#section20', {
        scrollTrigger: {
            trigger: "#section20",
            start: "1600 top",
            scrub: true,
            toggleClass:'on5',
        }

    });

    gsap.to('#section21 .fix-this-21', {
        scrollTrigger: {
            trigger: "#section21 .trigger-this-21",
            start: "top top",
            // end: () => "+=" + 300,
            end: 'bottom bottom',
            pin:true,
            scrub: true,
        }
    });

    gsap.to('#section21 .th_top', {
        y: -100,
        scrollTrigger: {
            trigger: "#section21",
            start: "top top",
            end: () => "+=" + 500,
            scrub: true,
        }

    });

    gsap.to('#section21 .bg_12', {
        y: 0,
        scrollTrigger: {
            trigger: "#section21",
            start: "top 800",
            end: () => "+=" + 300,
            scrub: true,
        }

    });

    gsap.to('#section21', {
        scrollTrigger: {
            trigger: "#section21",
            start: "-800 top",
            scrub: true,
            toggleClass:'on1',
        }

    });

    gsap.to('#section21', {
        scrollTrigger: {
            trigger: "#section21",
            start: "-400 top",
            scrub: true,
            toggleClass:'on2',
        }

    });

    gsap.to('#section21 .last_txt', {
        opacity: 1,
        y: 0,
        scrollTrigger: {
            trigger: "#section21",
            start: "500 top",
            end: () => "+=" + 300,
            scrub: true,
        }

    });


});







