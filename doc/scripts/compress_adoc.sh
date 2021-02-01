#!/bin/bash

ROOTFILE=$1
OUTFILE=$2

outputString=""

function resolveIncludes {
    file=$1
    levelOffset=$2

    #find current directory
    currentDir="."
    rgxDir="((\.?\/?\w+\/)+).+"

    #echo $file>>debug.log
    if [[ $file =~ $rgxDir ]]; then
        #echo "match">>debug.log
        currentDir=${BASH_REMATCH[1]}
    fi
    #echo "currentdir:$currentDir">>debug.log
    rgxInclude="^include::(.+)\[(leveloffset=([0-9]+))?\]"
    rgxSection="^=+ \w*"
    output=""

    while IFS= read -r line
    do
        #Find section heads
        if [[ $line =~ $rgxSection ]]; then
        #echo "found section head LINE: $line"
            if [ $levelOffset -gt 0  ]; then
                for ((c=0; c<$levelOffset; c++))
                do
                    line="=$line"
                done
            fi
        fi

        #Find includes
        if [[ $line =~ $rgxInclude ]]; then
            includeFile=${BASH_REMATCH[1]}
            offset=${BASH_REMATCH[3]}
            #replace the include
            line=$(resolveIncludes "$currentDir/$includeFile" $offset)
        fi

        output="$output\n$line" #>> output #check
    
    done < "$file"
    echo $output
}
#resolveIncludes $ROOTFILE 0
outputString="$(resolveIncludes $ROOTFILE 0)"

echo -e "$outputString" > $OUTFILE

#Add correct version number to output file
PACKAGE_VERSION=$(node -p -e "require('$GITHUB_WORKSPACE/package.json').version")
sed -i "s/___VERSION___/$PACKAGE_VERSION/g" OUTFILE